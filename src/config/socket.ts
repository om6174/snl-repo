import express from 'express';
import { Server, Socket } from 'socket.io';
import http from 'http';
import { DefaultEventsMap } from 'socket.io/dist/typed-events';
import knex from './knex';
import { GameplayStatus } from '../enums';
//cIdx: current player's index
let snakes: Record<number, number>;
let ladders: Record<number, number>;

async function snl()
{
    let r = await knex('snakesLadders').select().first('*');
    if(!r){
        const data = {
            snakePositions: {
                20: 18,
                13: 7,
                26: 16,
                30: 11,
                45: 34,
                39: 21
            },
            ladderPositions: {
                2: 21,
                5: 18,
                10: 29,
                17: 36,
                22: 38,
                32: 49,
                35: 44,
                37: 43,
            }
        };
    
        //Insert data into the 'players' table
        [r] = await knex('snakesLadders').insert(data).returning('*');
    }
    

    snakes = JSON.parse(r.snakePositions);
    ladders = JSON.parse(r.ladderPositions);
    return true;
}
async function gameExists(gameId: string)
{
    const record = await knex('gameplay')
        .where({ url: gameId })
        .andWhere((builder) =>
        {
            builder
                .where('status', GameplayStatus.LIVE)
                .orWhere('status', GameplayStatus.STARTED)
                .orWhere('status', GameplayStatus.PAUSED);
        })
        .first();
    return record;
};

async function imageData(gameId: string) {
    // Query the gameplay table to get the variation_id based on the given gameId and the gameplay status
    const gameplayRecord = await knex('gameplay').where({ url: gameId}).first();

    if (!gameplayRecord) {
        return null;
    }

    const variationRecord = await knex('variation').where({ id: gameplayRecord.variationId }).first();

    const players = await knex('user').where({ gameId: gameplayRecord.url });
    // Return the variation record
    return {images: variationRecord, players};
}


async function leaderboard(gameId: string)
{
    const records = await knex('user')
        .where({ gameId })
        .orderBy([{ column: 'score', order: 'desc' }, { column: 'finishedTime', order: 'asc' }]);

    return records;
}

async function createOrUpdateUser(userName: string, phoneNumber: string, gameId: string)
{
    let user = await knex('user').where({ phoneNumber, gameId }).first();

    if (user)
    {
        await knex('user').where({ id: user.id }).update({ numberOfDevices: user.numberOfDevices + 1 });
    } else
    {

        // Insert and retrieve the new user record
        [user] = await knex('user')
            .insert({ name: userName, phoneNumber, status: 1, numberOfDevices: 1, gameId, score: 0 })
            .returning('*');
        return { user, isCreated: true };
    }
    return { user, isCreated: false };
};

async function updateScore(id: number, score: number, finished: boolean = false)
{
    if (finished)
        await knex('user').where({ id }).update({ score, finishedTime: new Date() });
    else
        await knex('user').where({ id }).update({ score });
    return true;
}


async function updateGameStatus(gameId: string, status: GameplayStatus)
{
    await knex('gameplay').where({ url: gameId }).update({ status });
    return true;
}

//used to send one message to current player and a different one to other players
async function sendSeparateMessages(sockets: string[], gameId: string, currentPlayerMessage: any, otherPlayersMessage: any)
{
    sockets.forEach((socketId: string) =>
    {
        io.to(socketId).emit('message', currentPlayerMessage);
    });

    rooms[gameId].sockets.forEach((socketId: string) =>
    {
        if (!sockets.includes(socketId))
            io.to(socketId).emit('message', otherPlayersMessage);
    });

    return true;
}

async function emitNextPlayerInfo(sockets: string[], gameId: string, currentPlayerMessage: any, otherPlayersMessage: any)
{
    sockets.forEach((socketId: string) =>
    {
        io.to(socketId).emit('yourTurn', currentPlayerMessage);
    });

    rooms[gameId].sockets.forEach((socketId: string) =>
    {
        if (!sockets.includes(socketId))
            io.to(socketId).emit('nextPlayer', otherPlayersMessage);
    });

    return true;
}

function disconnectAllSockets(gameId: string)
{
    // Get all sockets in the game room
    const socketsInRoom = rooms[gameId].sockets;

    // If there are any sockets in the room, disconnect them
    if (socketsInRoom.length)
    {

        // Iterate over each socket in the room
        for (const socketId of socketsInRoom)
        {
            // Get the socket by ID
            const socket = io.sockets.sockets.get(socketId);

            if (socket)
            {
                socket.disconnect(true);
            }
        }

        delete rooms[gameId];
    }
}

let io: Server<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>;
const rooms: Record<string, any> = {}; // Keep track of the game rooms and their states

async function handleSpectatorConnection(socket: Socket, gameId: string)
{
    try{
    if(!gameId) throw new Error("gameId is required.");

    const game = await gameExists(gameId);
    if (!game) throw new Error("Invalid game.");

    const room = rooms[gameId] ||= { players: [], cIdx: 0, sockets: [], ongoing: game.status === GameplayStatus.STARTED };
    room.sockets.push(socket.id);

    socket.join(gameId);
    socket.emit('imageData', await imageData(gameId));

    socket.emit('message', 'You are now spectating the game.');
    if (rooms[gameId].ongoing === true) socket.emit('message', 'The game has already started.');
    if (game.status === GameplayStatus.PAUSED) socket.emit('pause', 'Game has been paused.');

    socket.on('start', async () =>
    {
        if (rooms[gameId].players.length === 0)
        {
            socket.emit('error', 'Atleast one participant is required to start the game.');
            return;
        }

        console.log(`Game ${gameId} started`);
        await updateGameStatus(gameId, GameplayStatus.STARTED);
        socket.broadcast.to(gameId).emit('message', 'Game started.');

        rooms[gameId].ongoing = true;
        const firstPlayer = room.players[rooms[gameId].cIdx];
        emitNextPlayerInfo(firstPlayer.sockets,
            gameId, 
            {message:'Your turn.', userId: firstPlayer.id}, 
            {message:`${firstPlayer.name}'s turn.`, userId: firstPlayer.id}
        )
    });

    socket.on('pause', async () =>
    {
        if (!rooms[gameId].ongoing)
        {
            socket.emit('error', "The game has not started yet.");
            return;
        };

        console.log(`Game ${gameId} paused`);
        await updateGameStatus(gameId, GameplayStatus.PAUSED);
        room.ongoing = false;
        socket.broadcast.to(gameId).emit('pause', 'Game has been paused.');
        socket.emit('pause', 'You paused the game.');
    });
} catch (err: any)
{
    console.error(err);
    socket.emit('error', err.message);
    socket.disconnect(true);
}

}
//TODO: add currentPlayerIndex to gameplay table
async function handlePlayerConnection(socket: Socket, gameId: string, playerPhone: string, playerName: string)
{
    try{
    if (!playerName || !playerPhone)
    {
        socket.emit('error', "Send a valid gameId, playerName, and playerPhone.");
        socket.disconnect(true);
        return;
    }

    let room = rooms[gameId];
    if (!room)
    {
        const game = await gameExists(gameId);
        if (!game) throw new Error("Invalid game.");
        if (game.status === GameplayStatus.STARTED)
        {
            console.log(`Room ${gameId} was abandoned, game has been paused.`);
            await updateGameStatus(gameId, GameplayStatus.PAUSED);
            socket.emit('pause', 'Game has been paused.');
        };
        room = rooms[gameId] = { players: [], cIdx: 0, sockets: [], ongoing: false };
    }else if(room.ongoing === false){
        const game = await gameExists(gameId);
        if (!game) throw new Error("Invalid game.");
        if (game.status === GameplayStatus.PAUSED) socket.emit('pause', 'Game has been paused.');

    }

    let { user } = await createOrUpdateUser(playerName, playerPhone, gameId);

    socket.join(gameId);
    room.sockets.push(socket.id);
    let userActive = room.players.find((user: any) => user.phoneNumber === playerPhone);

    if (userActive)
    {
        userActive.sockets.push(socket.id);
    } else
    {
        room.players.push({ ...user, sockets: [socket.id] });
        socket.broadcast.to(gameId).emit('message', `User ${playerName} has joined the game.`,);
    }

    socket.emit('imageData', await imageData(gameId));

    socket.on('rollDice', async () =>
    {

        if (!room.ongoing)
        {
            socket.emit('error', "The game has not started yet.");
            return;
        };

        const currentPlayer = room.players[room.cIdx];

        if (!currentPlayer.sockets.includes(socket.id))
        {
            socket.emit('error', 'Not your turn');
            return;
        }

        const diceRoll = Math.floor(Math.random() * 6) + 1;

        currentPlayer.score = Math.min(currentPlayer.score + diceRoll, 50);

        if (currentPlayer.score >= 50)
        {
            await updateScore(currentPlayer.id, currentPlayer.score, true);

            // The current user has won the game
            sendSeparateMessages(
                currentPlayer.sockets,
                gameId,
                'Congratulations! You completed the game!',
                `${currentPlayer.name} has finished.`
            );

            // Remove the current user from the game
            room.players.splice(room.cIdx, 1);

            if (room.players.length === 0)
            {
                io.to(gameId).emit('gameOver', await leaderboard(gameId));
                await updateGameStatus(gameId, GameplayStatus.FINISHED);
                disconnectAllSockets(gameId);
                return;
            }

            room.cIdx = room.cIdx % room.players.length;
        }
        else
        {
            if (!snakes || !ladders)
            {
                await snl();
            }
            if (snakes[currentPlayer.score])
            {
                io.to(gameId).emit('factoid', currentPlayer.score)
                currentPlayer.score = snakes[currentPlayer.score];
                sendSeparateMessages(
                    currentPlayer.sockets,
                    gameId, 
                    `You rolled a ${diceRoll} and got bitten by a snake. Now at ${currentPlayer.score}`,
                    `${currentPlayer.name} rolled a ${diceRoll} and got bitten by a snake. He's Now at ${currentPlayer.score}`
                );
            } else if (ladders[currentPlayer.score])
            {
                io.to(gameId).emit('factoid', currentPlayer.score)
                currentPlayer.score = ladders[currentPlayer.score];
                sendSeparateMessages(
                    currentPlayer.sockets,
                    gameId, 
                    `You rolled a ${diceRoll} and climbed a ladder to position ${currentPlayer.score}`,
                    `${currentPlayer.name} climbed a ladder to position ${currentPlayer.score}`
                );

            }
            else{
                sendSeparateMessages(
                    currentPlayer.sockets,
                    gameId, 
                    `You rolled a ${diceRoll}. Your current position is ${currentPlayer.score}.`,
                    `${currentPlayer.name} rolled a ${diceRoll}.`
                );
            }
            await updateScore(currentPlayer.id, currentPlayer.score);



            room.cIdx = (room.cIdx + 1) % room.players.length;
        }

        const nextUser = room.players[room.cIdx];

        // Notify the next user that it's their turn to roll the dice
        emitNextPlayerInfo(nextUser.sockets,
            gameId, 
            {message:'Your turn.', userId: nextUser.id}, 
            {message:`${nextUser.name}'s turn.`, userId: nextUser.id}
        )    });
} catch (err: any)
{
    console.error(err);
    socket.emit('error', err.message);
    socket.disconnect(true);
}
}

export function setupSocket(app: express.Application): http.Server
{
    // Create an HTTP server using the Express app
    const httpServer = http.createServer(app);


    io = new Server(httpServer, {
        cors: {
            origin: '*',
        },
    });


    // Handle user connections
    io.on('connection', async (socket) =>
    {
        console.log('A client connected:', socket.id);
        let userId: any;
        try
        {
            const { type, gameId } = socket.handshake.query as { type: string, gameId: string };
            if (!type || !gameId)
                {
                    socket.emit('error', "Send a valid gameId, type.");
                    socket.disconnect(true);
                    return;
                }
            if (type === 'spectator')
            {
                handleSpectatorConnection(socket, gameId);
                return;
            }
            else if (type === 'player')
            {
                const { playerPhone, playerName } = socket.handshake.query as { playerPhone: string, playerName: string };
                handlePlayerConnection(socket, gameId, playerPhone, playerName);

            }

            socket.on('disconnect', () =>
            {
                console.log(`Client ${socket.id} disconnected`);
                // Handle user disconnection as needed
            });
        } catch (err: any)
        {
            console.error(err);
            socket.emit('error', err.message);
            socket.disconnect(true);
        }
    });

    // Return the HTTP server instance
    return httpServer;
}

// Export the `io` instance so it can be used elsewhere
export { io };
