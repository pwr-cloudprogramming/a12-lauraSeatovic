class Board():
    def __init__(self, boardSize = 3):
        self.boardSize = boardSize
        self.winner = None

        self.reset()
    
    def checkEmptyField(self, row, column):
        return self.boardMatrix[row][column] == ''
            
    
    def addMove(self, row, column, playerId, playerSymbol):
        self.boardMatrix[row][column] = playerSymbol
        self.lastPlayer = playerId

    def winnerCheck(self):
        for row in self.boardMatrix:
            if all((cell == row[0] and cell != '' for cell in row)):
                print("winner row")
                return self.lastPlayer
            
        for col in range(self.boardSize):
            if all((self.boardMatrix[row][col] == self.boardMatrix[0][col] and self.boardMatrix[row][col] != '' for row in range(self.boardSize))):
                print("winner col")
                return self.lastPlayer

        d1 = self.boardMatrix[0][0]
        d1Counter = 0

        d2 = self.boardMatrix[0][self.boardSize - 1]
        d2Counter = 0


        for i in range(self.boardSize):
            if(d1 != '' and self.boardMatrix[i][i] == d1):
                d1Counter += 1
            if(d2 != '' and self.boardMatrix[i][self.boardSize - 1 - i] == d2):
                d2Counter += 1
            
        if(d1Counter == self.boardSize or d2Counter == self.boardSize):
            print("winner dig")
            return self.lastPlayer
        
        return None
    
    def checkEnd(self):
        if all(cell != '' for row in self.boardMatrix for cell in row):
            print("true")
            return True
        print("FALSE")
        return False
    
    
    def reset(self):
        self.lastPlayer = None
        self.winner = None
        self.boardMatrix = [['' for i in range (self.boardSize)] for k in range (self.boardSize)]
            
