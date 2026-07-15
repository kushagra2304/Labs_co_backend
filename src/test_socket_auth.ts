import { PrismaClient } from '@prisma/client';
import { handlePresenceEvents } from './lab_chat/sockets/presence.socket-handler';
import { handleMessageEvents } from './lab_chat/sockets/message.socket-handler';
import { PresenceService } from './lab_chat/services/presence.service';
import { MessageService } from './lab_chat/services/message.service';
import { EventEmitter } from 'events';

const prisma = new PrismaClient();

// Simple mock for Socket.IO Socket
class MockSocket extends EventEmitter {
  public data: any = { user: {} };
  public roomsJoined: string[] = [];
  public emittedEvents: { event: string; data: any }[] = [];

  constructor(userId: string) {
    super();
    this.data.user.id = userId;
  }

  join(room: string) {
    this.roomsJoined.push(room);
  }

  leave(room: string) {
    this.roomsJoined = this.roomsJoined.filter(r => r !== room);
  }

  emit(event: string, data: any) {
    this.emittedEvents.push({ event, data });
    return true;
  }

  // Trigger helper to simulate receiving client events
  simulateClientEmit(event: string, data: any) {
    const listeners = this.listeners(event);
    for (const listener of listeners) {
      listener(data);
    }
  }
}

// Simple mock for Server
class MockServer {
  public emittedEvents: { room: string; event: string; data: any }[] = [];
  
  to(room: string) {
    return {
      emit: (event: string, data: any) => {
        this.emittedEvents.push({ room, event, data });
      }
    };
  }

  in(_room: string) {
    return {
      fetchSockets: async () => []
    };
  }
}

async function runTests() {
  console.log('🧪 Starting Socket.IO Security Authorization Tests...');

  // 1. Fetch two active users from DB
  const users = await prisma.user.findMany({
    where: { isActive: true },
    take: 2,
  });

  if (users.length < 2) {
    console.error('❌ Error: Need at least 2 active users in DB to run tests.');
    process.exit(1);
  }

  const [userA, userB] = users;
  console.log(`User A (Authorized): ${userA.name} (${userA.email}) [${userA.id}]`);
  console.log(`User B (Unauthorized): ${userB.name} (${userB.email}) [${userB.id}]`);

  // 2. Create a test direct conversation including User A but EXCLUDING User B
  // We'll create a direct conversation between User A and himself or find a dummy
  console.log('Creating test conversation...');
  const conversation = await prisma.conversation.create({
    data: {
      type: 'GROUP',
      title: 'Audit Security Test Group',
      createdBy: userA.id,
      members: {
        create: [
          { userId: userA.id, createdBy: userA.id }
        ]
      }
    }
  });

  console.log(`Created test conversation: ${conversation.id}`);

  const presenceService = new PresenceService();
  const messageService = new MessageService();
  const mockServer = new MockServer();

  try {
    // ----------------------------------------------------
    // Scenario 1: Valid (Authorized) User joins their own conversation
    // ----------------------------------------------------
    console.log('\n--- Test Case 1: Authorized User (User A) ---');
    const socketA = new MockSocket(userA.id);
    handlePresenceEvents(mockServer as any, socketA as any, presenceService);
    
    // Simulate userA emitting 'join_room'
    socketA.simulateClientEmit('join_room', { conversationId: conversation.id });

    // Wait short time for async DB authorization check
    await new Promise(resolve => setTimeout(resolve, 200));

    const userAJoined = socketA.roomsJoined.includes(conversation.id);
    const userAHasErrors = socketA.emittedEvents.some(e => e.event === 'error');

    if (userAJoined && !userAHasErrors) {
      console.log('✅ PASS: Authorized user successfully joined their conversation room.');
    } else {
      console.error(`❌ FAIL: Authorized user failed to join. Joined: ${userAJoined}, Errors:`, socketA.emittedEvents);
    }

    // ----------------------------------------------------
    // Scenario 2: Unauthorized User tries to join User A's conversation
    // ----------------------------------------------------
    console.log('\n--- Test Case 2: Unauthorized User (User B) ---');
    const socketB = new MockSocket(userB.id);
    handlePresenceEvents(mockServer as any, socketB as any, presenceService);

    // Simulate userB emitting 'join_room' to User A's conversation
    socketB.simulateClientEmit('join_room', { conversationId: conversation.id });

    await new Promise(resolve => setTimeout(resolve, 200));

    const userBJoined = socketB.roomsJoined.includes(conversation.id);
    const userBError = socketB.emittedEvents.find(e => e.event === 'error');

    if (!userBJoined && userBError && userBError.data.message.includes('Unauthorized')) {
      console.log('✅ PASS: Unauthorized join request was successfully rejected.');
      console.log(`Received expected error: "${userBError.data.message}"`);
    } else {
      console.error(`❌ FAIL: Unauthorized join was not handled correctly. Joined: ${userBJoined}, Emitted:`, socketB.emittedEvents);
    }

    // ----------------------------------------------------
    // Scenario 3: Unauthorized User tries to emit typing indicator or message
    // ----------------------------------------------------
    console.log('\n--- Test Case 3: Unauthorized Socket Events ---');
    
    // Check send_message authorization
    const msgSocketB = new MockSocket(userB.id);
    handleMessageEvents(mockServer as any, msgSocketB as any, messageService);
    
    msgSocketB.simulateClientEmit('send_message', {
      conversationId: conversation.id,
      content: 'I should not be allowed to post here',
    });

    await new Promise(resolve => setTimeout(resolve, 200));

    const sendError = msgSocketB.emittedEvents.find(e => e.event === 'error');
    if (sendError && sendError.data.message.includes('Unauthorized')) {
      console.log('✅ PASS: Unauthorized send_message event was successfully rejected.');
    } else {
      console.error('❌ FAIL: Unauthorized send_message event was not blocked or returned wrong error:', msgSocketB.emittedEvents);
    }

    // Check typing_start authorization
    socketB.emittedEvents = [];
    socketB.simulateClientEmit('typing_start', { conversationId: conversation.id });
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const typingError = socketB.emittedEvents.find(e => e.event === 'error');
    if (typingError && typingError.data.message.includes('Unauthorized')) {
      console.log('✅ PASS: Unauthorized typing_start event was successfully rejected.');
    } else {
      console.error('❌ FAIL: Unauthorized typing_start event was not blocked:', socketB.emittedEvents);
    }

  } finally {
    // Cleanup test data
    console.log('\nCleaning up test database records...');
    await prisma.conversationMember.deleteMany({
      where: { conversationId: conversation.id }
    });
    await prisma.conversation.delete({
      where: { id: conversation.id }
    });
    console.log('Cleanup done.');
  }
}

runTests()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
