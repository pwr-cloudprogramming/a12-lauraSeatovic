document.addEventListener('DOMContentLoaded', function() {
    const boardElement = document.getElementById('board');
    const addButton = document.getElementById('add-player-btn');
    const resetButton = document.getElementById('reset-game-btn');
    const newGameButton = document.getElementById('new-game-btn');
    const joinGameButton = document.getElementById('join-game-btn');

    const verifyButton = document.getElementById('verify')

        if (verifyButton) { // Check if the button exists before adding the event listener
            verifyButton.addEventListener('click', verifyCode);
        } else {
            console.error("Element with ID 'verify' not found.");
        }

    const baseUrl = 'http://localhost:8080';
    let socket = null;

    const poolData = {
        UserPoolId: 'us-east-1_RtsW9dCwF', // Your user pool id here
        ClientId: '25f1pfetvq571i5s5d1mggs5to'// Your client id here
    };
    const userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);

    const signupButton = document.getElementById('signup')

    if (signupButton) { // Check if the button exists before adding the event listener
        signupButton.addEventListener('click', signup);
    } else {
        console.error("Element with ID 'signup' not found.");
    }

    const loginButton = document.getElementById('login')
    
    if (loginButton) { // Check if the button exists before adding the event listener
        loginButton.addEventListener('click', login);
    } else {
        console.error("Element with ID 'login' not found.");
    }
        
    function signup() {
        const email = document.getElementById('signupEmail').value;
        const name = document.getElementById('signupName').value;
        const password = document.getElementById('signupPassword').value;
    
        const attributeList = [];
        const dataEmail = {
            Name: 'email',
            Value: email,
        };
        const dataName = {
            Name: 'name',
            Value: name,
        };
        const attributeEmail = new AmazonCognitoIdentity.CognitoUserAttribute(dataEmail);
        const attributeName = new AmazonCognitoIdentity.CognitoUserAttribute(dataName);
    
        attributeList.push(attributeEmail);
        attributeList.push(attributeName);
    
        userPool.signUp(email, password, attributeList, null, function (err, result) {
            if (err) {
                alert('Error signing up: ' + err.message);
                return;
            }
            const cognitoUser = result.user;
            // Redirect to verification page with username as query parameter
            window.location.href = 'verify.html?username=' + encodeURIComponent(email);
        });
    }

    //socket.on('connect', function() {
      //  console.log('Connected to server');
    //});

    let playerIds = [];
    let currentPlayerIndex = 0;

    let gameOver = false;


    async function addPlayer() {
        const id_token = localStorage.getItem('idToken');
        const name = localStorage.getItem('name')
        if (name) {
            const url = `${baseUrl}/add_player`;
            const data = {
                playerId: '',  // Let backend generate player ID
                symbol: '',  // Let backend assign symbol (X or O)
                name: name,
                game_id: localStorage.getItem('gameId')
            };
            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${id_token}`
                    },
                    body: JSON.stringify(data)
                });
                if (!response.ok) {
                    throw new Error('Failed to add player');
                }
                const responseData = await response.json();
                if(responseData.success){
                    localStorage.setItem('playerId', responseData.player_id);
                    playerIds.push(responseData.player_id);
                    console.log('Player added successfully:', responseData);
                    console.log('Player IDs:', playerIds);

                    const player = document.getElementById('player');
                    player.textContent = "Player:" + name;
                    player.style.display = 'block'
                }else{
                    console.log('Error:', responseData);
                }
            } catch (error) {
                console.error('Error adding player:', error);
            }
        }
    }

    async function startNewGame() {
        gameOver = false;
        const url = `${baseUrl}/new_game`;
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error('Failed to start new game');
            }
            const responseData = await response.json();
            if(responseData.success){
                console.log('Started new game:', responseData);
                console.log(responseData.game_id);
                localStorage.setItem('gameId', responseData.game_id);

                const gameId = localStorage.getItem('gameId');
                const gameIdContainer = document.getElementById('gameIdContainer');
                gameIdContainer.textContent = `Game ID: ${gameId}`;
                
                socket = io(baseUrl);

                socket.on('connect', () => {
                    console.log('Before emitting join event');
                    socket.emit("join", { room: gameId });
                    console.log('After emitting join event');


                    socket.on('update_board', function(data) {
                        console.log('Received update from server:', data);
                        renderBoard()
                        // Update the board based on the data received
                    });
                
                    socket.on('players', function(data) {
                        console.log('Received update from server:', data);
                        showPlayers(data.player_names)
                    });
                
                    socket.on('game_status', function(data) {
                        console.log('Received update from server:', data);
                        showMessage(data.message)
                        // Update the board based on the data received
                    });
                
                })
                

                renderBoard()
            }else{
                console.log('Error:', responseData);
            }
        } catch (error) {
            console.error('Error starting new game:', error);
        }
    }
    
    
    // Function to fetch board matrix from backend
    async function fetchBoardMatrix() {
        const url = `${baseUrl}/get_board_matrix`;
        const data = {
            game_id: localStorage.getItem('gameId')
        };
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            if (!response.ok) {
                throw new Error('Failed to fetch board matrix');
            }
            return await response.json();  // Convert response to JSON format
        } catch (error) {
            console.error('Error fetching board matrix:', error);
        }
    }

    async function resetBoard() {
        try {
            gameOver = false;
            const response = await fetch(`${baseUrl}/reset_board`);// Fetch data from backend endpoint
            if (!response.ok) {
                throw new Error('Failed to reset board matrix');
            }
            showMessage("")
            renderBoard()
            return await response.json();  // Convert response to JSON format
        } catch (error) {
            console.error('Error resetin board matrix:', error);
        }
    }
    // Function to check for a winner
    function checkWinner() {
        // Logic to check for a winner (not implemented in this example)
        // You can implement your own logic to check for a winning condition
    }

    // Function to handle cell click event
    async function handleCellClick(row, col) {
        const id_token = localStorage.getItem('idToken');
        const playerId = playerIds[currentPlayerIndex];
        const url = `${baseUrl}/make_move`;
        console.log(playerId)
        console.log(playerIds)

        if (gameOver == true) {
            console.log('Game is over. Cannot make a move.');
            return;
        }

        const data = {
            player_id: localStorage.getItem('playerId'), // Assuming currentPlayer is the player ID
            row: row,
            col: col,
            game_id: localStorage.getItem('gameId')
        };
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${id_token}`
                },
                body: JSON.stringify(data)
            });
            if (!response.ok) {
                throw new Error('Failed to make move');
            }
            const responseData = await response.json();
            console.log('Move made successfully:', responseData);
            const status = responseData.status;
            if (status === 0) {
                console.log('Game over! Winner is ' + responseData.winner);
                gameOver = true;
                //showMessage('Game over! Winner is ' + responseData.winner);
            } else if (status === 1) {
                gameOver = true;
                //showMessage('Game over! No winner!');
                console.log('Game over! No winner.');
            } else if (status === 2) {
                console.log('Game still in progress.');
                // Continue the game
            } else {
                console.error('Invalid status received:', status);
            }
            renderBoard();
            currentPlayerIndex = (currentPlayerIndex + 1) % playerIds.length;
        } catch (error) {
            console.error('Error making move:', error);
        }
    }

    async function joinGame() {
        gameOver = false
        const gameId = prompt('Enter game id:');
        const url = `${baseUrl}/check_game_id`;
        const data = {
            game_id: gameId
        };
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            if (!response.ok) {
                throw new Error('Failed to join');
            }
            const responseData = await response.json();
            if(responseData.success){
                localStorage.setItem('gameId', gameId );
                console.log("Joined new game", responseData)
                
                socket = io(baseUrl);

                socket.on('connect', () => {
                    socket.emit("join", { room: gameId });

                    socket.on('update_board', function(data) {
                        console.log('Received update from server:', data);
                        renderBoard()
                        // Update the board based on the data received
                    });
                
                    socket.on('players', function(data) {
                        console.log('Received update from server:', data);
                        showPlayers(data.player_names)
                    });
                
                    socket.on('game_status', function(data) {
                        console.log('Received update from server:', data);
                        showMessage(data.message)
                        // Update the board based on the data received
                    });
                
                
                })

                const gameIdContainer = document.getElementById('gameIdContainer');
                gameIdContainer.textContent = `Game ID: ${gameId}`;

                renderBoard()
        }else{
            console.log("Error joining new game", responseData)
        }
        } catch (error) {
            console.error('Error joining new game:', error);
        }
    }


    
    function showMessage(message) {
        const messageElement = document.getElementById('message');
        messageElement.textContent = message;
        messageElement.style.display = 'block';
    }

    function showPlayers(players) {
        const playersElement = document.getElementById('players');
        playersElement.textContent = "Players: " + players;
        playersElement.style.display = 'block';
    }

    if (addButton && newGameButton && joinGameButton) { // Check if the button exists before adding the event listener
        addButton.addEventListener('click', addPlayer);
        //resetButton.addEventListener('click', resetBoard);
        newGameButton.addEventListener('click', startNewGame);
        joinGameButton.addEventListener('click', joinGame);
    } else {
        console.error("Elements not found.");
    }

    // Function to render the Tic Tac Toe board
    async function renderBoard() {
        const boardMatrix = await fetchBoardMatrix();  // Fetch board matrix data
        if (!boardMatrix) {
            console.error('Board matrix data is empty');
            return;
        }
        boardElement.innerHTML = ''; // Clear previous content
        boardMatrix.forEach((row, rowIndex) => {
            row.forEach((cell, colIndex) => {
                const cellElement = document.createElement('div');
                cellElement.classList.add('cell');
                cellElement.textContent = cell;
                cellElement.addEventListener('click', () => handleCellClick(rowIndex, colIndex));
                boardElement.appendChild(cellElement);
            });
        });
    }


    window.onload = function() {
        // Check if the URL contains the tokens
        if (window.location.hash) {
            const hash = window.location.hash.substring(1);
            const params = new URLSearchParams(hash);
    
            // Get tokens from URL fragments
            const idToken = params.get('idToken');
            const accessToken = params.get('access_token');
            const refreshToken = params.get('refresh_token');
            const tokenType = params.get('token_type');
            const expiresIn = params.get('expires_in');
    
            // Store tokens in local storage or cookies
            if (idToken) {
                localStorage.setItem('idToken', idToken);
            }
            if (accessToken) {
                localStorage.setItem('access_token', accessToken);
            }
            if (refreshToken) {
                localStorage.setItem('refresh_token', refreshToken);
            }
            if (tokenType) {
                localStorage.setItem('token_type', tokenType);
            }
            if (expiresIn) {
                localStorage.setItem('expires_in', expiresIn);
            }
    
            // Remove tokens from URL
            window.location.hash = '';

            // Retrieve user's display name from the ID token
            const decodedIdToken = parseJwt(idToken);
            const displayName = decodedIdToken.name || decodedIdToken.email || 'User';

            localStorage.setItem('name', displayName);

            // Redirect to the homepage or another desired page
            window.location.href = 'http://localhost:5500';
            }

            // Update UI on page load
            updateUI();
        };

        // Function to parse JWT token
        function parseJwt(token) {
            if (!token) {
                return {};
            }
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));

            return JSON.parse(jsonPayload);
        };

        // Function to update the UI based on login status
        function updateUI() {
            const idToken = localStorage.getItem('idToken');
            const displayName = localStorage.getItem('name');
            const logoutButton = document.getElementById('logout');
            const displayNameElement = document.getElementById('display-name');
            const loginButton = document.getElementById('login-btn');

            if (idToken && displayName) {
                console.log("logged in")
                // User is logged in, display user info and logout button
                displayNameElement.textContent = `Welcome, ${displayName}`;
                logoutButton.style.display = 'inline';
                loginButton.style.display = 'none'; // Hide the login button
            } else {
                // User is not logged in, hide user info and logout button
                displayNameElement.textContent = '';
                logoutButton.style.display = 'none';
                loginButton.style.display = 'block'; // Show the login button
            }
        }

        // Function to log out the user
        function logout() {
            localStorage.removeItem('idToken');
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            localStorage.removeItem('token_type');
            localStorage.removeItem('expires_in');
            localStorage.removeItem('name');
            updateUI();
        }

        document.getElementById('logout').addEventListener('click', logout);


        
        function login() {
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
        
            const authenticationData = {
                Username: email,
                Password: password,
            };
            const authenticationDetails = new AmazonCognitoIdentity.AuthenticationDetails(authenticationData);
        
            const userData = {
                Username: email,
                Pool: userPool,
            };
            const cognitoUser = new AmazonCognitoIdentity.CognitoUser(userData);
        
            cognitoUser.authenticateUser(authenticationDetails, {
                onSuccess: function (result) {
                    const idToken = result.getIdToken().getJwtToken(); // Get the ID token
                    // Save the ID token to local storage
                    localStorage.setItem('idToken', idToken);

                    const decodedIdToken = parseJwt(idToken);
                    const displayName = decodedIdToken.name || decodedIdToken.email || 'User';

                    localStorage.setItem('name', displayName);
                    
                    // Redirect to home page or perform any other action
                    window.location.href = 'index.html';

                    // Wait for the window to finish navigating to the new page
                },
                onFailure: function (err) {
                    alert('Error signing in: ' + err.message);
                },
            });
        }

        window.onload = function() {
            // Call updateUI() after the page has loaded
            updateUI();
        };


        function verifyCode() {
            const urlParams = new URLSearchParams(window.location.search);
            const username = urlParams.get('username');
            const verificationCode = document.getElementById('verificationCode').value;

            const userData = {
                Username: username,
                Pool: userPool
            };

            const cognitoUser = new AmazonCognitoIdentity.CognitoUser(userData);

            cognitoUser.confirmRegistration(verificationCode, true, function (err, result) {
                if (err) {
                    alert('Error verifying account: ' + err.message);
                    return;
                }
                window.location.href = 'login.html';
            });
        }

});
