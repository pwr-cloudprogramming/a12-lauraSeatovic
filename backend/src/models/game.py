from models import Board, Player
import random
import uuid
from flask import jsonify


class Game():
    def __init__(self):
        self.board = Board()
        self.players = {}
        self.gameId = str(uuid.uuid4())[:8]
        self.currentPlayerId = None
        self.turnCount = 0
        self.playersIdList = []
    
    def newPlayer(self, name, playerId, photoName):
        print("dict in new", self.players)
        if(len(self.players) >= 2):
            return jsonify({'success': False, 'message': 'There are already two players!'})
        
        #playerId = str(uuid.uuid4())[:8]

        if playerId not in self.players:

            if len(self.players) == 0:
                symbol = 'x'
            else:
                symbol = 'o'

            player = Player(symbol, playerId, name, photoName)

            self.players[playerId] = player
            self.playersIdList.append(playerId)
            print("addplayer", self.players)
            if len(self.players) == 2 and self.currentPlayerId is None:
                self.currentPlayerId = self.getNextPlayerId()

            return jsonify({'success': True, 'message': f'Added new player {name}!', 'player_id': playerId})
        else:
            return jsonify({'success': False, 'message': 'Player ID already exists!'})
        
    def makeMove(self, playerId, row, col):
        print(playerId)
        player = self.players.get(playerId)
        print("players", self.players)
        print("myplayer", player)
        if player is None:
            return jsonify({'success': False, 'message': 'Invalid player ID!'})
        
        if playerId != self.currentPlayerId:
            return jsonify({'success': False, 'message': 'Not your turn!'})
        
        if not self.board.checkEmptyField(row, col):
            return jsonify({'success': False, 'message': 'Cell already occupied!'})

        self.board.addMove(row, col, player.playerId, player.symbol)
        self.turnCount += 1

        self.currentPlayerId = self.getNextPlayerId()

        return self.checkWinner()

    def checkWinner(self):
        winner = self.board.winnerCheck()

        if winner:
            self.board.winner = winner
            self.winnerPlayer = self.players[winner]
            return {'success': True, 'winner': self.winnerPlayer.name, 'status': 0, 'message': f'Game over! Winner is {self.winnerPlayer.name}'} #game over and there is a winner
        if self.board.checkEnd():
            print("game controller", "tie")
            return {'success': True, 'message': 'Tie!', 'status': 1} #tie game
        else:
            return {'success': True, 'message': 'Game still on!', 'status': 2} #game is not over

    def getPlayersName(self):
        if len(self.players) > 0:
            return [player.name for player in self.players.values()]
        else:
            return []
        
    def getPlayers(self):
        if len(self.players) > 0:
            return [{'name': player.name, 'playerId': player.playerId, 'photoName': player.photoName} for player in self.players.values()]

        else:
            return []
    

    def getNextPlayerId(self):
        return self.playersIdList[self.turnCount % 2]
    
    def getBoard(self):
        return self.board.boardMatrix
    
    def resetBoard(self):
        self.board.reset()

