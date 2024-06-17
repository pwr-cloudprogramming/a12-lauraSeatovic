import json
import boto3

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('TicTacToeScores')

def lambda_handler(event, context):
    if event['httpMethod'] == 'POST':
        body = json.loads(event['body'])
        game_id = body['game_id']
        player_id = body['player_id']
        score = body['score']
        
        table.put_item(
            Item={
                'gameId': game_id,
                'playerId': player_id,
                'score': score
            }
        )
        return {
            'statusCode': 200,
            'body': json.dumps('Score added successfully')
        }
    
    if event['httpMethod'] == 'GET':
        game_id = event['queryStringParameters']['game_id']
        
        response = table.query(
            KeyConditionExpression=boto3.dynamodb.conditions.Key('game_id').eq(game_id)
        )
        
        return {
            'statusCode': 200,
            'body': json.dumps(response['Items'])
        }

    return {
        'statusCode': 400,
        'body': json.dumps('Unsupported method')
    }
