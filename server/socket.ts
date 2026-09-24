/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Server as SocketIOServer } from "socket.io";
import type { Server as HttpServer } from "http";

let io: SocketIOServer | null = null;

export function initSocketIO(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  io.on("connection", (socket) => {
    // Connected client ready to receive real-time maintenance and platform signals
  });

  return io;
}

export function getIO(): SocketIOServer | null {
  return io;
}
