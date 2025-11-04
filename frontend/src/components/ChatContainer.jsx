// Updating ChatContainer.jsx to properly handle sender name display in group chat

import { useChatStore } from "../store/useChatStore";
import { useEffect, useRef } from "react";
import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import { useAuthStore } from "../store/useAuthStore";
import { formatMessageTime } from "../lib/utils";

const ChatContainer = () => {
  const {
    messages,
    getMessages,
    isMessagesLoading,
    selectedChat,
    subscribeToMessages,
    unsubscribeFromMessages,
    aiMessages
  } = useChatStore();

  const { authUser } = useAuthStore();
  const messageEndRef = useRef(null);
  const isGroupChat = selectedChat?.isGroup || false;

  const seen = new Set();
  const combinedMessages = [
    ...messages,
    ...(aiMessages[selectedChat?._id] || []),
  ].filter((msg) => {
    if (seen.has(msg._id)) return false;
    seen.add(msg._id);
    return true;
  }).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  useEffect(() => {
    if (selectedChat) {
      getMessages();
      subscribeToMessages();
    }
    return () => unsubscribeFromMessages();
  }, [selectedChat, getMessages, subscribeToMessages, unsubscribeFromMessages]);

  useEffect(() => {
    if (messageEndRef.current && messages.length) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  if (!selectedChat) {
    return <div className="flex-1 flex items-center justify-center">Select a chat to start messaging</div>;
  }

  if (isMessagesLoading) {
    return (
      <div className="flex-1 flex flex-col overflow-auto">
        <ChatHeader />
        <MessageSkeleton />
        <MessageInput />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      <ChatHeader />

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {combinedMessages
          .filter(
            (message) =>
              !message.privateTo || // ✅ Show public messages
              message.privateTo === authUser._id // ✅ Sho  es only to the intended user
          )
          .map((message) => (
            <div
              key={message._id}
              className={`chat ${message.senderId?._id?.toString() === authUser._id?.toString()
                ? "chat-end"
                : "chat-start"
                }`}
              ref={messageEndRef}
            >
              <div className="chat-image avatar">
                <div className="size-10 rounded-full border">
                  <img
                    src={
                      isGroupChat
                        ? (message.senderId?.profilePic || "/avatar.png") // ✅ group: use sender info
                        : (message.senderId?._id?.toString() === authUser._id?.toString()
                          ? (authUser.profilePic || "/avatar.png")       // ✅ my own messages
                          : (selectedChat?.profilePic || "/avatar.png"))  // ✅ the other person
                    }
                    alt={`${message.senderId?.fullName || "User"}'s profile picture`}
                  />
                </div>
              </div>
              <div className="chat-header mb-1">
                {isGroupChat && (
                  <span className="text-xs">
                    {message.senderId._id === authUser._id ? "Me" : message.senderId.fullName}
                  </span>
                )}
                <time className="text-xs opacity-50 ml-1">
                  {formatMessageTime(message.createdAt)}
                </time>
              </div>
              <div className="chat-bubble flex flex-col">
                {message.image && (
                  <img
                    src={message.image}
                    alt="Attachment"
                    className="sm:max-w-[200px] rounded-md mb-2"
                  />
                )}
                {message.file && (
                  <a
                    href={message.file}
                    download={message.fileName}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 underline"
                  >
                    📄 {message.fileName || "Download File"}
                  </a>
                )}
                {message.text && <p>{message.text}</p>}
              </div>
            </div>
          ))}
      </div>


      <MessageInput />
    </div>
  );
};

export default ChatContainer;
