import Amqp from 'amqplib'
import express from 'express'
import { Server, Socket } from 'socket.io'
import http from 'http'

const app = express()
const server = http.createServer(app)
const io = new Server(server)
const sockets: Socket[] = []

async function initialize() {

  async function prepareAMQP() {
    const connection = await Amqp.connect({
      hostname: process.env.RABBIT_HOST,
      password: process.env.RABBIT_PASSWORD,
      username: process.env.RABBIT_USER,
    })

    process.once("SIGINT", async () => {
      await connection.close();
    });
    return connection
  }

  const connection = await prepareAMQP()

  app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
  });

  io.on('connection', (socket) => {
    sockets.push(socket)
    socket.on('disconnect', () => {
      sockets.splice(sockets.indexOf(socket), 1)
    })
  });

  const channel = await connection.createChannel()

  await channel.consume('notifications', queue => {
    queue?.content.toString() && io.emit('notifications', JSON.parse(queue?.content.toString()))
  })

  await channel.consume('dynamic', queue => {
    queue?.content.toString() && io.emit('dynamic', JSON.parse(queue?.content.toString()))
  })

  server.listen(3000, () => {
    console.log('listening on *:3000');
  });

}

initialize()