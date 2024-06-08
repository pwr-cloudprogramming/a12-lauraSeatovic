from flask import request, jsonify
from models import Game
import random
import uuid

class GameController:
    def __init__(self):
        self.games = {}
        self.players = {}
        self.currentPlayerId = None
        self.turnCount = 0

    def newGame(self):
        newGame = Game()
        self.games[newGame.gameId] = newGame
        return jsonify({'success': True, 'message': f'Started new game!', 'game_id': newGame.gameId})

    def newPlayer(self, name, gameId):
        return self.games[gameId].newPlayer(name)
    
    def makeMove(self, playerId, row, col, gameId):
        return self.games[gameId].makeMove(playerId, row, col)
    

    #def getNextPlayerId(self):
    #    return list(self.players.keys())[self.turnCount % 2]
    
    def getBoard(self, gameId):
        return self.games[gameId].board.boardMatrix
    
    def resetBoard(self):
        self.board.reset()

    def getPlayers(self, gameId):
        return self.games[gameId].getPlayersName()

    def checkGameId(self, gameId):
        return gameId in self.games

