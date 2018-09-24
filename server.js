var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var port = process.env.PORT || 4000;

var UserManager = {
    userList: [],
    socketList: []
}

io.sockets.on('connection', function(socket) {
    console.log("A User is connected, socketId = " + socket.id);
    var object = {};
    object.type = 'welcome';
    object.id = socket.id;
    sendMessageToClient(socket, object);
    
    socket.on('message', function(data) { handleDataReceive(data, socket); });
    socket.on('disconnect', function() { handleDisconnectUser(socket); });
    
    /* -------------------- FUNCTION DEATAILS -------------------- */
    
    function handleDisconnectUser(socket) {
        var index = (UserManager.socketList).map(function(item) { return item.id; }).indexOf(socket.id);
        if(index !== -1) {
            var typeDevice = UserManager.userList[index].type_device;
            
            (UserManager.socketList).splice(index, 1);
            (UserManager.userList).splice(index, 1);

            if(typeDevice === 'player') {
                var object = {};
                object.type = 'remove_player';
                object.id = socket.id;
                sendMessageToGlobal(socket, object);
            }
        }
    }
    
    function handleDataReceive(data, socket) {
        switch(data.type) {
            case 'user_info':
                var index = (UserManager.socketList).map(function(item) { return item.id; }).indexOf(socket.id);
                if(index !== -1) { return; }
                
                var object = {};
                var user = {};
                user.type_device = data.data;
                user.id = socket.id;
                user.status = 'disconnected';
                UserManager.userList.push(user);
                
                UserManager.socketList.push(socket);
                
                if(user.type_device === 'player') {
                    object.type = 'add_player';
                    object.id = socket.id;
                    sendMessageToGlobal(socket, object);
                } else {
                    object.type = 'user_list';
                    object.data = UserManager.userList;
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
        if(socketClient !== null) {
            var object = {};
            object.id = socketId;
            object.type = data.type;
            object.data = data.data;
            sendMessageToClient(socketClient, object);
        }
    }
    
    function getSocketClient(id) {
        var socketClient = null;
        var idx = UserManager.socketList.map(function(item) { return item.id; }).indexOf(id);
        if(idx !== -1) {
            socketClient = UserManager.socketList[idx];
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

app.get('/', function(req, res){
    res.sendFile(__dirname + '/index.html');
});

http.listen(port, function(){
  console.log('listening on *:' + port);
});
