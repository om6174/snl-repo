import { Socket } from "socket.io";
import knex from "../../config/knex";
import { createOrUpdateUser, emitNextPlayerInfo, gameExists, getIO, imageData, leaderboard, rooms, sendSeparateMessages, updateGameStatus, updateScore } from "./socket";
import { GameplayStatus } from "../../enums";


let snakes: Record<number, number>;
let ladders: Record<number, number>;

const playerColours = [
    "#ff0000", // red
    "#0000ff", // blue
    "#00ffff", // cyan
    "#ff00ff", // magenta
    "#008000", // green
    "#ffff00", // yellow
    "#ffa500", // orange
    "#800080", // purple
    "#008080", // teal
    "#ffc0cb"  // pink
];

function disconnectAllSockets(gameId: string, io: any)
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

function handleExtraScore(previousScore: number, newScore: number, reverse: boolean = false){
    const biggerSquares = [2, 6, 12, 16, 21, 25, 28, 33, 38, 41, 45, 48, 51, 58]
    if(reverse === false){
    for(let el of biggerSquares){
            if(el >= previousScore && el < newScore){
                newScore +=1;
            }else if(el > newScore){
                break;
            }
        }
    }
    else{
        for (let i = biggerSquares.length - 1; i >= 0; i--) {
            if(biggerSquares[i] >= newScore && biggerSquares[i] < previousScore){
                newScore -=1;
            }else if(biggerSquares[i] < previousScore){
                break;
            }
        }
    }

    return newScore;
};

async function snl()
{
    await knex('snakesLadders').del();

    let r = await knex('snakesLadders').select().first('*');
    if(!r){
        const data = {
            snakePositions: {
                16: 9,
                25: 23,
                33: 20,
                38: 14,
                51: 27,
                58: 44
            },
            ladderPositions: {
                2: 27,
                6: 23,
                12: 37,
                21: 47,
                28: 50,
                41: 63,
                45: 57,
                48: 56,

            }
        };
    
        //Insert data into the 'players' table
        [r] = await knex('snakesLadders').insert(data).returning('*');
    }
    

    snakes = JSON.parse(r.snakePositions);
    ladders = JSON.parse(r.ladderPositions);
    return true;
}

//TODO: add currentPlayerIndex to gameplay table
export async function handlePlayerConnection(socket: Socket, gameId: string, playerPhone: string, playerName: string)
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

    let { user } = await createOrUpdateUser(playerName, playerPhone, gameId, playerColours[room.players.length%10]);

    socket.join(gameId);
    room.sockets.push(socket.id);
    let userActive = room.players.find((user: any) => user.phoneNumber === playerPhone);

    if (userActive)
    {
        userActive.sockets.push(socket.id);
    } else
    {
        room.players.push({ ...user, sockets: [socket.id] });
        socket.broadcast.to(gameId).emit('newUser', {message:`User ${playerName} has joined the game.`, ...user, userList: room.players},);
    }

    socket.emit('imageData',{ ...await imageData(gameId), user});

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

        currentPlayer.previousScore = currentPlayer.score;
        currentPlayer.score = Math.min(currentPlayer.score + diceRoll, 64);
        currentPlayer.score = handleExtraScore(currentPlayer.previousScore, currentPlayer.score);
        
        if (currentPlayer.score >= 64)
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
                        getIO().to(socketId).emit('drumRoll', {message: "Congratulations! You completed the game."});
                });            
            // Remove the current user from the game
            room.players.splice(room.cIdx, 1);

            if (room.players.length === 0)
            {
                socket.to(gameId).emit('gameOver', await leaderboard(gameId));
                await updateGameStatus(gameId, GameplayStatus.FINISHED);
                disconnectAllSockets(gameId, getIO());
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
                currentPlayer.score = snakes[currentPlayer.score];
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
                currentPlayer.score = ladders[currentPlayer.score];

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

            if(diceRoll === 6 && currentPlayer.score < 64){
                console.log("6")
            }else{
                room.cIdx = (room.cIdx + 1) % room.players.length;
            }
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
