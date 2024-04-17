import express from 'express';
import { Server } from 'socket.io';
import http from 'http';
import { DefaultEventsMap } from 'socket.io/dist/typed-events';
import knex from './knex';
import { GameplayStatus } from '../enums';

let snakes: Record<number, number>;
let ladders: Record<number, number>;

async function snl(){
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
  
      // Insert data into the 'users' table
      const [r] = await knex('snakesLadders').insert(data).returning('*');
      snakes = JSON.parse(r.snakePositions);
      ladders = JSON.parse(r.ladderPositions);

}
async function gameExists(gameId: string)
{
    const record = await knex('gameplay')
        .where({ url: gameId })
        .andWhere((builder) =>
        {
            builder
                .where('status', GameplayStatus.LIVE)
                .orWhere('status', GameplayStatus.STARTED);
        })
        .first();
    return record;
};

async function hasGameStarted(gameId: string)
{
    const record = await knex('gameplay')
        .where({ url: gameId, status: GameplayStatus.STARTED })
        .first();
    return !!record;
};

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
            .insert({ name: userName, phoneNumber, status: 1, numberOfDevices: 1, gameId })
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
async function sendSeparateMessages(sockets: string[], gameId: string, currentPlayerMessage: string, otherPlayersMessage: string)
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

        try
        {
            // Extract userName, gameId, and phoneNumber from query parameters
            const { userName, gameId, phoneNumber } = socket.handshake.query as { userName: string, gameId: string, phoneNumber: string };


            if (!userName || !gameId || !phoneNumber)
            {
                socket.emit('error', "Send a valid gameId, userName, and phoneNumber.");
                socket.disconnect(true);
                return;
            }
            const game = await gameExists(gameId);
            if (!game) throw new Error("Invalid game.");
            // Check if the game state for this gameId already exists, if not create it
            rooms[gameId] ||= { users: [], currentUserIndex: 0, sockets: [], hasGameStarted: game.status === GameplayStatus.STARTED };
            if (game.status === GameplayStatus.STARTED) rooms[gameId].hasGameStarted = true;

            // Check if the user exists in the database, or create a new user
            let { user, isCreated } = await createOrUpdateUser(userName, phoneNumber, gameId);
            if (isCreated)
            {
                // Add the user to the game's state

                // Notify all other users in the game room that a new user has joined
                socket.broadcast.to(gameId).emit('message', `User ${userName} has joined the game.`,);
            };

            rooms[gameId].sockets.push(socket.id);
            let userActive = rooms[gameId].users.find((user: any) => user.phoneNumber === phoneNumber);

            if (userActive)
            {
                userActive.sockets.push(socket.id);
            } else
            {
                rooms[gameId].users.push({ ...user, sockets: [socket.id] });
            }

            // Join the socket to the specified game room
            socket.join(gameId);


            socket.on('rollDice', async () =>
            {

                const gameStarted = await hasGameStarted(gameId);
                if (!rooms[gameId].hasGameStarted)
                {
                    socket.emit('error', "The game has not started yet.");
                    return;
                };

                const currentUserIndex = rooms[gameId].currentUserIndex;
                const currentUser = rooms[gameId].users[currentUserIndex];

                if (!currentUser.sockets.includes(socket.id))
                {
                    socket.emit('error', 'Not your turn');
                    return;
                }

                const diceRoll = Math.floor(Math.random() * 6) + 1;

                currentUser.score = Math.min(currentUser.score + diceRoll, 100);

                // Update the user's score in the database

                if (currentUser.score >= 100)
                {
                    await updateScore(currentUser.id, currentUser.score, true);

                    // The current user has won the game
                    sendSeparateMessages(
                        currentUser.sockets,
                        gameId,
                        'Congratulations! You have won the game!',
                        `${currentUser.name} has finished.`
                    );

                    // Remove the current user from the game
                    rooms[gameId].users.splice(currentUserIndex, 1);
                    if (rooms[gameId].users.length === 0)
                    {

                        io.to(gameId).emit('gameOver', await leaderboard(gameId));
                        await updateGameStatus(gameId, GameplayStatus.FINISHED);
                        disconnectAllSockets(gameId);
                        return;
                    }
                    rooms[gameId].currentUserIndex = currentUserIndex % rooms[gameId].users.length;
                }
                else
                {
                    if (!snakes || !ladders){
                        await snl();
                    }
                    if(snakes[currentUser.score]){
                        currentUser.score = snakes[currentUser.score]
                    }else if(ladders[currentUser.score]){
                        currentUser.score = ladders[currentUser.score]
                    }
                    await updateScore(currentUser.id, currentUser.score);

                    sendSeparateMessages(
                        currentUser.sockets,
                        gameId, `You rolled a ${diceRoll}. 
                    Your current position is ${currentUser.score}.`,
                        `${currentUser.name} rolled a ${diceRoll}.`
                    );

                    rooms[gameId].currentUserIndex = (currentUserIndex + 1) % rooms[gameId].users.length;
                }

                const nextUser = rooms[gameId].users[rooms[gameId].currentUserIndex];

                // Notify the next user that it's their turn to roll the dice
                io.to(nextUser.sockets).emit('yourTurn');
            });

            socket.on('start', async () =>
            {
                console.log(`Game ${gameId} started`);
                await updateGameStatus(gameId, GameplayStatus.STARTED);
                rooms[gameId].hasGameStarted = true;
                const firstUser = rooms[gameId].users[rooms[gameId].currentUserIndex];
                io.to(firstUser.sockets).emit('yourTurn');
            });

            socket.on('pause', async () =>
            {
                console.log(`Game ${gameId} paused`);
                await updateGameStatus(gameId, GameplayStatus.PAUSED);
                rooms[gameId].hasGameStarted = false;
                io.to(gameId).emit('pause', 'Game has been paused by the trainer');

            });

            // Handle disconnection
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
