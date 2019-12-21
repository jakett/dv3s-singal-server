var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var port = process.env.PORT || 4000;

var UserManager = [];


io.sockets.on('connection', function (socket) {
    console.log("A User is connected, socketId = " + socket.id);
    var object = {};
    object.type = 'welcome';
    object.id = socket.id;
    sendMessageToClient(socket, object);

    socket.on('message', function (data) { handleDataReceive(data, socket); });
    socket.on('disconnect', function () { handleDisconnectUser(socket); });

    /* -------------------- FUNCTION DEATAILS -------------------- */

    function handleDisconnectUser(socket) {
        UserManager = UserManager.filter(item => {
            if (item.socket.id === socket.id) {
                var object = {
                    type: 'remove_player',
                    user: item.user
                };
                sendMessageToGlobal(socket, object);
            }
            return item.socket.id !== socket.id;
        })
    }

    function handleDataReceive(data, socket) {
        switch (data.type) {
            case 'user_info':
                var object = {};
                var user = {};
                user.typeApp = data.data.typeApp;
                user.userId = data.data.userId;
                user.userName = data.data.userName;
                user.browserInfo = data.data.browserInfo;
                user.startTime = new Date().getTime();
                user.socketId = socket.id;
                user.status = 'disconnected';

                console.log("TVT user info = " + JSON.stringify(user));

                const idx = UserManager.map(item => item.socket.id).indexOf(socket.id);
                if (idx !== -1) {
                    UserManager[idx].user = user;
                    UserManager[idx].socket = socket;
                } else {
                    UserManager.push({
                        user: user,
                        socket: socket
                    });
                }

                if (user.typeApp === 'Remote Player') {
                    object.type = 'add_player';
                    object.user = user;
                    sendMessageToGlobal(socket, object);
                } else {
                    object.type = 'user_list';
                    object.data = UserManager.map(item => item.user);
                    sendMessageToClient(socket, object);
                }
                break;
            case 'offer':
            case 'answer':
            case 'candidate':
                handleEvent(socket.id, data);
                break;
            case 'leave':
                break;
            default:
        }
    }

    function handleEvent(socketId, data) {
        var destinationId = data.id;
        var socketClient = getSocketClient(destinationId);
        if (socketClient !== null) {
            var object = {};
            object.id = socketId;
            object.type = data.type;
            object.data = data.data;
            sendMessageToClient(socketClient, object);
        }
    }

    function getSocketClient(id) {
        var socketClient = null;
        var idx = UserManager.map(item => item.socket.id).indexOf(id);
        if (idx !== -1) {
            socketClient = UserManager[idx].socket;
        }
        return socketClient;
    }

    function sendMessageToClient(socket, dataSend) {
        socket.emit('message', dataSend);
    }

    function sendMessageToGlobal(socket, dataSend) {
        socket.broadcast.emit('message', dataSend);
    }
})

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html');
});

http.listen(port, function () {
    console.log('listening on *:' + port);
});
