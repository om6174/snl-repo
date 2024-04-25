import express from 'express';
import { Server, Socket } from 'socket.io';
import http from 'http';
import { DefaultEventsMap } from 'socket.io/dist/typed-events';
import knex from './knex';
import { GameplayStatus } from '../enums';
import randomColour from 'randomcolor';
//cIdx: current player's index
let snakes: Record<number, number>;
let ladders: Record<number, number>;

function handleExtraScore(previousScore: number, newScore: number){
    const biggerSquares = [2, 5, 10, 13, 17, 20, 22, 26,30, 32, 35, 37, 39, 45]
    let extraCount = 0;
    for(let el of biggerSquares){
        if(el > previousScore && el < newScore){
            extraCount += 1;
        }else if(el > newScore){
            break;
        }
    }
    return extraCount;
};

async function snl()
{
    let r = await knex('snakesLadders').select().first('*');
    if(!r){
        const data = {
            snakePositions: {
                13: 7,
                20: 18,
                26: 16,
                30: 11,
                39: 21,
                45: 34,
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
    variationRecord.additionalDetails = JSON.parse(variationRecord.additionalDetails);
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
        var color = randomColour();
        // Insert and retrieve the new user record
        [user] = await knex('user')
            .insert({ name: userName, phoneNumber, status: 1, numberOfDevices: 1, gameId, score: 1, colour: color })
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
async function sendSeparateMessages(currentPlayer: any, gameId: string, currentPlayerMessage: any, otherPlayersMessage: any, diceValue: number, factoid: string | null = null)
{
    currentPlayer.sockets.forEach((socketId: string) =>
    {
        io.to(socketId).emit('diceRolled', {message: currentPlayerMessage, diceValue, currentPosition: currentPlayer.score, self: true, factoid, player: currentPlayer});
    });

    rooms[gameId].sockets.forEach((socketId: string) =>
    {
        if (!currentPlayer.sockets.includes(socketId))
            io.to(socketId).emit('diceRolled', {message: otherPlayersMessage, diceValue, currentPosition: currentPlayer.score, self: false, factoid, player: currentPlayer});
    });

    return true;
}

async function emitNextPlayerInfo(sockets: string[], gameId: string, currentPlayerMessage: any, otherPlayersMessage: any, user: any)
{
    sockets.forEach((socketId: string) =>
    {
        io.to(socketId).emit('nextPlayer', {...currentPlayerMessage, self: true, user});
    });

    rooms[gameId].sockets.forEach((socketId: string) =>
    {
        if (!sockets.includes(socketId))
            io.to(socketId).emit('nextPlayer', {...otherPlayersMessage, self: false, user});
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
    
    let room = rooms[gameId];
    if (!room)
    {
        const game = await gameExists(gameId);
        if (!game) throw new Error("Invalid game.");
        room = rooms[gameId] = { players: [], cIdx: 0, sockets: [], ongoing: false };
        if (game.status === GameplayStatus.STARTED)
        {
            console.log(`Room ${gameId} was abandoned, game has been paused.`);
            await updateGameStatus(gameId, GameplayStatus.PAUSED);

            socket.emit('pause', 'Game has been paused.');
        };
    }
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
            {message:`${firstPlayer.name}'s turn.`, userId: firstPlayer.id, name: firstPlayer.name},
            firstPlayer
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

    socket.on('end', async () =>
        {
            if (!rooms[gameId]?.ongoing)
            {
                socket.emit('error', "The game has not started yet.");
                return;
            };
    
            console.log(`Game ${gameId} ended`);
            await updateGameStatus(gameId, GameplayStatus.LIVE);
            room.ongoing = false;
            socket.to(gameId).emit('message', 'Game has been ended by the trainer');
            socket.to(gameId).emit('gameOver', await leaderboard(gameId));
            socket.to(gameId).disconnectSockets();
            delete rooms[gameId];
        });

    socket.on('removePlayer', async (playerId: string) =>
        {
            const id = Number.parseInt(playerId);
            console.log(`Player ${id} removed!!!`);
            const index = room.players.findIndex((player: any) => player.id === id);
            if (index !== -1) {
                room.players[index].sockets.forEach((element: string) => {
                    io.to(element).disconnectSockets();
                });
                room.players = room.players.filter((el: any)=>el.id!==id);
                room.cIdx = room.cIdx % room.players.length;

                const nextUser = room.players[room.cIdx];

                if(room.players.length === 0){
                    await updateGameStatus(gameId, GameplayStatus.PAUSED);
                    socket.broadcast.to(gameId).emit('pause', 'Game has been paused.');
                    socket.emit('pause', 'You paused the game by removing the last player.');
                }else{
                    emitNextPlayerInfo(nextUser.sockets,
                        gameId, 
                        {message:'Your turn.', userId: nextUser.id}, 
                        {message:`${nextUser.name}'s turn.`, userId: nextUser.id, name: nextUser.name},
                        nextUser
                    );
                }
                
            }
            await knex('user').where({id, gameId: gameId}).delete();

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
        socket.broadcast.to(gameId).emit('newUser', {message:`User ${playerName} has joined the game.`, ...user},);
    }

    socket.emit('imageData',{ ...await imageData(gameId), yourUserId: user.id});

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
        const previousScore = currentPlayer.score;
        currentPlayer.score = Math.min(currentPlayer.score + diceRoll, 65);

        if (currentPlayer.score >= 65)
        {
            await updateScore(currentPlayer.id, currentPlayer.score, true);

            // The current user has won the game
            sendSeparateMessages(
                currentPlayer,
                gameId,
                'Congratulations! You completed the game!',
                `${currentPlayer.name} has finished.`,
                diceRoll,
            );

            currentPlayer.sockets.forEach((socketId: string) =>
                {
                        io.to(socketId).emit('drumRoll');
                });            
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
                const factoid = currentPlayer.score;
                currentPlayer.score = snakes[currentPlayer.score] + handleExtraScore(previousScore, snakes[currentPlayer.score]);
                sendSeparateMessages(
                    currentPlayer,
                    gameId, 
                    `You rolled a ${diceRoll} and got bitten by a snake. Now at ${currentPlayer.score}`,
                    `${currentPlayer.name} rolled a ${diceRoll} and got bitten by a snake. He's Now at ${currentPlayer.score}`,
                    diceRoll,
                    "img"+factoid,
                );
            } else if (ladders[currentPlayer.score])
            {
                const factoid = currentPlayer.score;
                currentPlayer.score = ladders[currentPlayer.score] + handleExtraScore(previousScore, snakes[currentPlayer.score]);

                sendSeparateMessages(
                    currentPlayer,
                    gameId, 
                    `You rolled a ${diceRoll} and climbed a ladder to position ${currentPlayer.score}`,
                    `${currentPlayer.name} climbed a ladder to position ${currentPlayer.score}`,
                    diceRoll,
                    "img"+factoid,
                );

            }
            else{
                sendSeparateMessages(
                    currentPlayer,
                    gameId, 
                    `You rolled a ${diceRoll}. Your current position is ${currentPlayer.score}.`,
                    `${currentPlayer.name} rolled a ${diceRoll}.`,
                    diceRoll,
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
            {message:`${nextUser.name}'s turn.`, userId: nextUser.id, name: nextUser.name},
            nextUser
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
