import requests

url = 'http://127.0.0.1:5000/add_player'
data = {
    'playerId': 1,
    'symbol': 'X',
    'name': 'Alice'
}

response = requests.post(url, json=data)
print(response.json())


url = 'http://127.0.0.1:5000/get_board_matrix'

response = requests.get(url)
print(response.json())