import { GameplayStatus } from "../../enums";
import { emitNextPlayerInfo, gameExists, imageData, leaderboard, rooms, updateGameStatus } from "./socket";
import knex from '../../config/knex';
import { Socket } from "socket.io";
async function getVriationData(variationId: number){
    const data = await knex('variation').where({id: variationId}).first();
    return JSON.parse(data.additionalDetails);
}

export async function handleSpectatorConnection(socket: Socket, gameId: string)
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
        room = rooms[gameId] = { players: [], cIdx: 0, sockets: [], ongoing: false, variationData: await getVriationData(game.variationId) };
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
        if(!rooms[gameId]){
            socket.emit('error', 'Invalid game.');
            return;
        }
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
            await updateGameStatus(gameId, GameplayStatus.FINISHED);
            room.ongoing = false;
            socket.broadcast.to(gameId).emit('message', 'Game has been ended by the trainer');
            socket.emit('message', 'You paused the game.');
            const leaderData = await leaderboard(gameId);
            socket.broadcast.to(gameId).emit('gameOver', leaderData);
            socket.emit('gameOver', leaderData);

            //socket.to(gameId).disconnectSockets();
            delete rooms[gameId];
        });

    socket.on('removePlayer', async (playerId: string) =>
        {
            const id = Number.parseInt(playerId);
            console.log(`Player ${id} removed!!!`);
            const index = room.players.findIndex((player: any) => player.id === id);
            if (index !== -1) {
                room.players[index].sockets.forEach((element: string) => {
                    socket.to(element).disconnectSockets();
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