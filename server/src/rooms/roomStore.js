export const rooms = new Map();

export function getRoom(roomCode) {
  return rooms.get(roomCode) || null;
}

export function setRoom(room) {
  rooms.set(room.code, room);
  return room;
}

export function deleteRoom(roomCode) {
  return rooms.delete(roomCode);
}

export function countRooms() {
  return rooms.size;
}

export function listRooms() {
  return Array.from(rooms.values());
}
