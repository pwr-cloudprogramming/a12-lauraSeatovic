import requests
import jwt
from jwt.algorithms import RSAAlgorithm

REGION = 'us-east-1'
USERPOOL_ID = 'us-east-1_kSTmxWLPE'
APP_CLIENT_ID = '6e8tg55ngiab38bbj4i0q16khf'
JWKS_URL = f'https://cognito-idp.{REGION}.amazonaws.com/{USERPOOL_ID}/.well-known/jwks.json'

def get_jwks():
    response = requests.get(JWKS_URL)
    response.raise_for_status()
    return response.json()

def verify_token(id_token):
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

# Example usage
if __name__ == '__main__':
    try:
        token = "eyJraWQiOiJWeXNFVm11ZTU1QmZOaXRRaU4rb2hjN0NpS1dYR0ZaaFlxRDRcLzBodXo1Yz0iLCJhbGciOiJSUzI1NiJ9.eyJzdWIiOiIzNDA4ODRkOC03MDkxLTcwMjYtNjg4NC00NjFkZjEyZTA3ZmQiLCJlbWFpbF92ZXJpZmllZCI6ZmFsc2UsImlzcyI6Imh0dHBzOlwvXC9jb2duaXRvLWlkcC51cy1lYXN0LTEuYW1hem9uYXdzLmNvbVwvdXMtZWFzdC0xX2tTVG14V0xQRSIsImNvZ25pdG86dXNlcm5hbWUiOiIzNDA4ODRkOC03MDkxLTcwMjYtNjg4NC00NjFkZjEyZTA3ZmQiLCJvcmlnaW5fanRpIjoiMzZlZGNiZmItMzhlMS00Yjc5LTkyZjAtMzE4ZTJkZGRjYmVhIiwiYXVkIjoiNmU4dGc1NW5naWFiMzhiYmo0aTBxMTZraGYiLCJldmVudF9pZCI6IjJkODM3YjI4LWFjY2QtNDljMy05MDE1LWY0NDgwMWNiZjBhNSIsInRva2VuX3VzZSI6ImlkIiwiYXV0aF90aW1lIjoxNzE2OTAzOTMxLCJuYW1lIjoibGF1cmEiLCJleHAiOjE3MTY5MDc1MzEsImlhdCI6MTcxNjkwMzkzMSwianRpIjoiYWU5YWViMWItMGFkMC00YWQ4LWEyOGQtZDU5ODU2YzQ3NzY3IiwiZW1haWwiOiJsYXVyYS5zZWF0b3ZpY0BnbWFpbC5jb20ifQ.TV_MsEkuR7U4_3EQaaDRJex_hxP0DIRxBKu4WDGZ0ot8zb2HjA7esMm-12jc2sQNKghwu_U1oACECRrPRcBF7yXTg7pRQqNUzpfPazyPG7oWbGhp0S9QXk8rVdRJTnajsI8MYJEf5RPH_Ilne73XaswnquVID0lxT8omDwsN6Md-LOKREKaseyFiMedYQNB4BrXXwWyxH42d56Bwyof3Meor6QQIc87NB22624sjzKxf1E-QLz1hsf51gBnXxugUq4BnBlb3vZ5_bX0VgPLFDKiRPqnOg2Sdp8j4fkVecK7eK9qPZRE0zpx4USajSaXXYH7E-TjDcpNe9gsAvqVztA"
        claims = verify_token(token)
        print('Claims:', claims)
    except Exception as e:
        print(f'Error verifying token: {e}')
