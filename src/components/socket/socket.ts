import express from 'express';
import { Server, Socket } from 'socket.io';
import http from 'http';
import { DefaultEventsMap } from 'socket.io/dist/typed-events';
import knex from '../../config/knex';
import { GameplayStatus } from '../../enums';
import { handleSpectatorConnection } from './spectator';
import { handlePlayerConnection } from './player';
//cIdx: current player's index

export async function gameExists(gameId: string)
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

export async function imageData(gameId: string) {
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


export async function leaderboard(gameId: string)
{
    const records = await knex('user')
        .where({ gameId })
        .orderBy([{ column: 'score', order: 'desc' }, { column: 'finishedTime', order: 'asc' }]);

    return records;
}

export async function createOrUpdateUser(userName: string, phoneNumber: string, gameId: string, colour: string)
{
    let user = await knex('user').where({ phoneNumber, gameId }).first();

    if (user)
    {
        await knex('user').where({ id: user.id }).update({ numberOfDevices: user.numberOfDevices + 1 });
    } else
    {
        // Insert and retrieve the new user record
        [user] = await knex('user')
            .insert({ name: userName, phoneNumber, status: 1, numberOfDevices: 1, gameId, score: 1, colour: colour })
            .returning('*');
        return { user, isCreated: true };
    }
    return { user, isCreated: false };
};

export async function updateScore(id: number, score: number, finished: boolean = false)
{
    if (finished)
        await knex('user').where({ id }).update({ score, finishedTime: new Date() });
    else
        await knex('user').where({ id }).update({ score });
    return true;
}


export async function updateGameStatus(gameId: string, status: GameplayStatus)
{
    const [gameplay] = await knex('gameplay').where({ url: gameId }).update({ status }).returning('*');
    if(status === GameplayStatus.STARTED && gameplay.startedAt === null){
        await knex('gameplay').where({ url: gameId }).update({startedAt: new Date()})
    }
    return true;
}

//used to send one message to current player and a different one to other players
export async function sendSeparateMessages(currentPlayer: any, gameId: string, currentPlayerMessage: any, otherPlayersMessage: any, diceValue: number, factoid: string | null = null)
{
    currentPlayer.sockets.forEach((socketId: string) =>
    {
        io.to(socketId).emit('diceRolled', {message: currentPlayerMessage, diceValue, self: true, factoid, player: currentPlayer});
    });

    rooms[gameId].sockets.forEach((socketId: string) =>
    {
        if (!currentPlayer.sockets.includes(socketId))
            io.to(socketId).emit('diceRolled', {message: otherPlayersMessage, diceValue, self: false, factoid, player: currentPlayer});
    });

    return true;
}

export async function emitNextPlayerInfo(sockets: string[], gameId: string, currentPlayerMessage: any, otherPlayersMessage: any, user: any)
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



let io: Server<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>;
export const rooms: Record<string, any> = {}; // Keep track of the game rooms and their states

export const getIO = () =>{
    return io;
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
