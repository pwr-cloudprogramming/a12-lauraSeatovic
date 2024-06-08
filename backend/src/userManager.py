import boto3

class UserManager():
    def __init__(self) -> None:
        self.client = boto3.client('cognito-idp', region_name='us-east-1')

        
    # Function to sign in a user
    def signIn(self, username, password):
        try:
            response = self.client.initiate_auth(
                AuthFlow='USER_PASSWORD_AUTH',
                AuthParameters={
                    'USERNAME': username,
                    'PASSWORD': password
                },
                ClientId='4gcbhvp9hh3ufl1hq54jnjbcte'
            )
            print('Authentication successful', response)
            return response
        except self.client.exceptions.NotAuthorizedException as e:
            print('Authentication failed: Incorrect username or password')
            return None
        except self.client.exceptions.UserNotFoundException as e:
            print('Authentication failed: User not found')
            return None
        except Exception as e:
            print('Authentication failed:', e)
            return None

