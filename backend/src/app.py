from flask import Flask, render_template, request, jsonify, send_file
from controllers.gameController import GameController
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room
from userManager import UserManager
import cognitojwt
import requests
import jwt
from jwt.algorithms import RSAAlgorithm
import boto3
from io import BytesIO
import random

app = Flask(__name__, template_folder='templates')
socketio = SocketIO(app, cors_allowed_origins='*') #modify this!!
CORS(app)

game_controller = GameController()

s3 = boto3.client('s3')
bucket_name = 'images-cdd1edf7af7db6da'


@app.route('/')
def index():
    return render_template('index.html')

@app.route('/add_player', methods=['POST'])
def add_player():
    data = request.get_json()
    gameId = data.get('game_id')
    name = data.get('name')
    playerId = data.get('id')
    photoName = data.get('photoName')

    token = request.headers.get('Authorization')
    if not token:
        return jsonify({'message': 'Token is missing!'}), 401

    token = token.split()[1]
    print(token)
    try:
        claims = verifyToken(token)
        if claims:
            try:
                response = game_controller.newPlayer(name, gameId, playerId, photoName)
                print(game_controller.getPlayers(gameId))
                socketio.emit('players', {'players_info' : game_controller.getPlayers(gameId)}, to=gameId)
                print(response)
                return response
            except Exception as e:
                return jsonify({'success': False, 'message': str(e)})
        else:
            return jsonify({'message': 'Invalid token'}), 401
    except Exception as e:
        return jsonify({'message': 'Token verification failed', 'error': str(e)}), 401

    

@app.route('/make_move', methods=['POST'])
def make_move():
    token = request.headers.get('Authorization')
    if not token:
        return jsonify({'message': 'Token is missing!'}), 401

    token = token.split()[1]
    try:
        claims = verifyToken(token)
        if claims:
            data = request.get_json()
            playerId = data.get('player_id')
            gameId = data.get('game_id')
            row = data.get('row')
            col = data.get('col')

            try:
                response = game_controller.makeMove(playerId, row, col, gameId)
                print(response)
                socketio.emit('update_board', {'player_id': playerId, 'row': row, 'col': col}, to=gameId)
                socketio.emit('game_status', response, to=gameId)
                return jsonify(response)
            except Exception as e:
                return jsonify({'success': False, 'message': str(e)})
        else:
            return jsonify({'message': 'Invalid token'}), 401
    except Exception as e:
        return jsonify({'message': 'Token verification failed', 'error': str(e)}), 401
    
@app.route('/get_board_matrix', methods=['POST'])
def get_board_matrix():
    data = request.get_json()
    gameId = data.get('game_id')
    print(gameId)
    return jsonify(game_controller.getBoard(gameId))

@app.route('/check_game_id', methods=['POST'])
def check_game_id():
    data = request.get_json()
    gameId = data.get('game_id')
    if game_controller.checkGameId(gameId):
        socketio.emit('players', {'players_info' : game_controller.getPlayers(gameId)}, to=gameId)
        return jsonify({'success': True, 'message': f'Valid game id!'})
    return jsonify({'success': False, 'message': f'Invalid game id!'})


@app.route('/reset_board', methods=['GET'])
def reset_matrix():
    try:
        game_controller.resetBoard()
        return jsonify({'success': True, 'message': 'Board reseted!'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})
    
@app.route('/new_game', methods=['GET'])
def new_game():
    try:
        response = game_controller.newGame()
        return response
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})
    
@app.route('/protected-endpoint', methods=['POST'])
def protected_endpoint():
    token = request.headers.get('Authorization')
    if not token:
        return jsonify({'message': 'Token is missing!'}), 401

    token = token.split()[1]
    try:
        claims = verifyToken(token)
        if claims:
            return jsonify({'message': 'Access granted', 'claims': claims})
        else:
            return jsonify({'message': 'Invalid token'}), 401
    except Exception as e:
        return jsonify({'message': 'Token verification failed', 'error': str(e)}), 401
    
@socketio.on('connect')
def handle_connect():
    print('Client connected')

@socketio.on("join")
def handle_join(data):
    print("joining a room")
    room = data.get("room")
    if room:
        join_room(room)
        print(f"User {request.sid} joined room {room}")
    else:
        print("No room specified in the request.")

REGION = 'us-east-1'
USERPOOL_ID = 'us-east-1_6EVOsBDYp'
APP_CLIENT_ID = '2g9jee24r4up7ee0d5asb44ep0'
JWKS_URL = f'https://cognito-idp.{REGION}.amazonaws.com/{USERPOOL_ID}/.well-known/jwks.json'

def get_jwks():
    response = requests.get(JWKS_URL)
    response.raise_for_status()
    return response.json()

def verifyToken(id_token):
    try:
        jwks = get_jwks()
        headers = jwt.get_unverified_header(id_token)
        kid = headers['kid']

        # Find the key with the matching 'kid'
        key = next((key for key in jwks['keys'] if key['kid'] == kid), None)
        if not key:
            raise Exception('Public key not found in JWKS')

        public_key = RSAAlgorithm.from_jwk(key)
        print(f'Public key: {public_key}')

        # Verify and decode the token
        payload = jwt.decode(
            id_token,
            public_key,
            algorithms=['RS256'],
            audience=APP_CLIENT_ID,
            issuer=f'https://cognito-idp.{REGION}.amazonaws.com/{USERPOOL_ID}'
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise Exception('Token has expired')
    except jwt.InvalidTokenError as e:
        print(f'JWT Error: {e}')
        raise Exception('Invalid token')
    except Exception as e:
        print(f'Error: {e}')
        raise e
    

@app.route('/upload', methods=['POST'])
def upload_photo():
    # Get the uploaded file
    photo = request.files['photo']
    photo_name = request.form.get('photoName')
    # Upload the file to S3
    s3.upload_fileobj(photo, bucket_name, photo_name, ExtraArgs={'ContentType': 'image/jpeg'})

    return 'Photo uploaded successfully'

@app.route('/photo/<photo_name>', methods=['GET'])
def fetch_photo(photo_name):
    try:
        file_obj = s3.get_object(Bucket=bucket_name, Key=photo_name)
        return send_file(BytesIO(file_obj['Body'].read()), mimetype=file_obj['ContentType'])
    except Exception as e:
        return jsonify({'error': str(e)}), 404
    
@app.route('/random_game_id', methods=['GET'])
def join_random_game():
    if len(list(game_controller.games.keys())) > 0:
        gameId = random.choice(list(game_controller.games.keys()))
        socketio.emit('players', {'players_info' : game_controller.getPlayers(gameId)}, to=gameId)
        return jsonify({'success': True, 'game_id': gameId})
    else:
        return jsonify({'success': False, 'message': 'Failed to join a random game'}), 400



if __name__ == '__main__':
    print("starting....")
    socketio.run(app, debug = True, port=8080, host="0.0.0.0", allow_unsafe_werkzeug=True)
    print(verifyToken("eyJraWQiOiJNU0x1RWIrZTNtVHE5dWVsazFiN1NSVUp0ZEdkaENybkV5V1lWSUZBR2o4PSIsImFsZyI6IlJTMjU2In0.eyJhdF9oYXNoIjoickJEREF5TFNfLW9jMWFDRjNxS1hOQSIsInN1YiI6ImQ0MzhmNGI4LTQwOTEtNzA4Zi0yNWZlLTRlYWE2MDRhMjQ5OCIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAudXMtZWFzdC0xLmFtYXpvbmF3cy5jb21cL3VzLWVhc3QtMV9hNWtyMWhtRXEiLCJjb2duaXRvOnVzZXJuYW1lIjoiZDQzOGY0YjgtNDA5MS03MDhmLTI1ZmUtNGVhYTYwNGEyNDk4IiwiYXVkIjoiM243Z2RhbWNpNXQ3bGZuODV2bGZmNTIxYzYiLCJldmVudF9pZCI6ImJjM2M1ZDc4LTgyYjctNGEzZi1hODNlLWZkMjZlNjQzOGI2YiIsInRva2VuX3VzZSI6ImlkIiwiYXV0aF90aW1lIjoxNzE2MjAxNTQzLCJleHAiOjE3MTYyMDUxNDMsImlhdCI6MTcxNjIwMTU0MywianRpIjoiZDFmM2Y0YjUtZGZmMy00ZjMwLTlhOTEtYWY5NDFkZWQzZWMwIiwiZW1haWwiOiJsYXVyYS5zZWF0b3ZpY0BnbWFpbC5jb20ifQ.eO1rO4FLusC3EU1rlc6UX52y1W_lCmLhUDXaUq4h8hUNVfIg50yBoBWemzrrfN0Nw88s2JzgkNBXZ1CDSsIsypdTOmZ9JTVE8_tXc8EPejVl_SmUGDtMVk_cfdfVup2mZsRjUdy42ZoHQqG4RHwkxzf4_W9EPdv-xljBabJdVjCHLBsRA3wat2ZioWvoBFQ5xXSrNmwxEUhtrWRsitT5LbR73gHCWxMpNDJSklXgEvRS6ut-lLPPHLtNgzT8DqbiI48pBhyma2WEPyv6Ohp7jDOc7eV8-WAwwtzYe-K0PvcdJWS7du5Jjt8rtPfkQo_gcuotEDE3SiODyi0u6nPnRQ"))
    #app.run(debug=True)
    # Example usage