const express = require('express')
const { createServer } = require('http')
const { Server } = require('socket.io')

const app = express()
const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
})

const hosts = []

io.on('connection', (socket) => {
  console.log(socket.id, 'conected')

  socket.on('claimRoomName', (roomName, callback) => {
    const host = hosts.find(e => e.roomName === roomName)
    if (!host) {
      hosts.push({
        roomName,
        id: socket.id
      })
      console.log(socket.id, 'claimed room', roomName)
    } else {
      host.id = socket.id
      console.log(socket.id, 'reclaimed room', roomName)
    }
    const res = {}
    callback(res)
  })

  socket.on('joinRoom', (roomName, callback) => {
    if (!hosts.find(e => e.roomName === roomName && e.id === socket.id)) {
      const rooms = io.of('/').adapter.rooms
      if (!rooms.has(roomName)) {
        const res = { error: true, message: `Room ${roomName} doesn't exist` }
        callback(res)
        return
      } else {
        socket.join(roomName)
        const res = { hostId: hosts.find(e => e.roomName === roomName).id }
        callback(res)
        console.log(socket.id, 'joined room', roomName)
      }
    } else {
      socket.join(roomName)
      console.log(socket.id, 'joined room', roomName)
      const res = {}
      callback(res)
    }
    console.log('rooms:', io.of('/').adapter.rooms)
  })

  socket.on('broadcast', (roomName, text, callback) => {
    if (hosts.find(e => e.roomName === roomName && e.id === socket.id)) {
      socket.to(roomName).emit('cliText', text)
    } else {
      const res = { error: true, message: `Only host can broadcast to room ${roomName}` }
      callback(res)
    }
  })

  socket.on('dmToHost', (hostId, text, callback) => {
    if (hosts.find(e => e.id === hostId)) {
      io.to(hostId).emit('dm', socket.id, text)
    } else {
      const res = { error: true, message: `Host with id ${hostId} not found` }
      callback(res)
    }
  })

  socket.on('pollClients', (roomName, callback) => {
    const res = { clientsCount: io.sockets.adapter.rooms.get(roomName).size }
    callback(res)
  })

  socket.on('disconnect', () => {
    console.log(socket.id, 'disconnected\n')
  })
})

httpServer.listen(3000)
