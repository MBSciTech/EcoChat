# EcoChat

A real-time, eco-themed (or community-based) chat platform where users can join groups and exchange text, images, audio, video, polls, emojis, and more — built with React, Node.js, and WebSocket.

Frontend (React)  <——>  WebSocket Server (Node.js)  <——>  Database + Storage

Core Features

✅ Real-time group chat
✅ File upload (img/audio/video)
✅ Emoji & reactions
✅ Poll creation & voting
✅ Message seen/status
✅ Typing indicator
✅ Online/offline status
✅ Group creation & invites
✅ Message deletion/edit

eco-chat/
│
├── backend/
│   ├── server.js
│   ├── socket.js
│   ├── routes/
│   ├── controllers/
│   ├── models/
│   ├── middleware/
│   ├── uploads/
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── contexts/
│   │   ├── services/
│   │   ├── App.js
│   │   └── socket.js
│   └── package.json
│
└── README.md
