import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";

export const useChatStore = create((set, get) => ({
  messages: [],
  aiMessages: {},
  users: [],
  groups: [],
  selectedChat: null,
  isUsersLoading: false,
  isGroupsLoading: false,
  isMessagesLoading: false,
  isAiReturned: false,

  setAiReturned: (status) => {
    set({ isAiReturned: status });
  },

  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/users");
      set({ users: res.data.map((user) => ({ ...user, isGroup: false })) });
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isUsersLoading: false });
    }
  },

  getGroups: async () => {
    set({ isGroupsLoading: true });
    try {
      const res = await axiosInstance.get("/groups");
      set({
        groups: (res.data.groups || []).map((group) => ({
          ...group,
          isGroup: true,
        })),
      });
      console.log("📦 Loaded groups:", res.data.groups);
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isGroupsLoading: false });
    }
  },

  createGroup: async (groupData) => {
    try {
      const { authUser } = useAuthStore.getState();
      const updatedGroupData = {
        ...groupData,
        members: Array.from(new Set([...groupData.members, authUser._id])),
      };

      console.log("Sending data:", updatedGroupData);
      const res = await axiosInstance.post("/groups/create", updatedGroupData);

      console.log("Group created:", res.data);

      const populatedGroup = {
        ...res.data,
        isGroup: true,
      };

      set((state) => ({
        groups: [...state.groups, populatedGroup],
        selectedChat: populatedGroup,
      }));

      get().getMessages();

      const socket = useAuthStore.getState().socket;
      socket.emit("groupCreated", populatedGroup);
    } catch (error) {
      console.error("Error creating group:", error.response?.data);
      toast.error(error.response?.data?.message || "Failed to create group.");
    }
  },

  getMessages: async () => {
    const { selectedChat } = get();
    const { authUser } = useAuthStore.getState();
    if (!selectedChat || !authUser) return;

    set({ isMessagesLoading: true });
    try {
      const endpoint = selectedChat.isGroup
        ? `/groups/${selectedChat._id}/messages`
        : `/messages/${selectedChat._id}`;

      const res = await axiosInstance.get(endpoint);
      const raw = Array.isArray(res.data)
        ? res.data
        : res.data.messages || [];

      const formatted = raw.map((m) => ({
        ...m,
        isOwn: m.senderId?._id === authUser._id || m.senderId === authUser._id,
        senderId: m.senderId?._id
          ? m.senderId
          : { _id: m.senderId, fullName: "Unknown", profilePic: "" },
      }));

      set({ messages: formatted });
      console.log("💬 Loaded messages:", formatted);
    } catch (error) {
      console.error("getMessages error:", error);
      toast.error(error.response?.data?.message || "Failed to load messages.");
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  sendMessage: async (messageData) => {
    const { selectedChat } = get();
    const { authUser } = useAuthStore.getState();
    if (!selectedChat || !authUser) return;

    const isAICommand =
      messageData.text?.startsWith("@aria/") ||
      messageData.text?.startsWith("@aria-");

    try {
      const endpoint = selectedChat.isGroup
        ? `/groups/${selectedChat._id}/send?groupId=${selectedChat._id}`
        : `/messages/send/${selectedChat._id}?receiverId=${selectedChat._id}`;

      const formData = new FormData();
      formData.append("text", messageData.text || "");
      if (messageData.file) formData.append("file", messageData.file);

      const res = await axiosInstance.post(endpoint, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      // 🧠 AI COMMANDS SHOULD NOT BE PUSHED INTO CHAT
      if (isAICommand && !res.data?.result) {
        toast.success(res.data.message || "AI task started.");
        return; // ⬅️ STOP HERE
      }

      // 🟢 NORMAL USER MESSAGE FLOW
      const newMsg = res.data?.result || res.data;
      if (!newMsg) return;

      const formatted = {
        ...newMsg,
        senderId: newMsg.senderId?._id
          ? newMsg.senderId
          : { _id: newMsg.senderId, fullName: authUser.fullName, profilePic: authUser.profilePic },
        isOwn:
          newMsg.senderId?._id === authUser._id || newMsg.senderId === authUser._id,
      };

      set((state) => ({
        messages: [...state.messages, formatted],
      }));

      console.log("💌 Added new message:", formatted);
    } catch (error) {
      console.error("sendMessage error:", error);
      toast.error(error.response?.data?.message || "Failed to send message.");
    }
  },

  subscribeToMessages: () => {
    const socket = useAuthStore.getState().socket;
    const currentSelectedChat = get().selectedChat;
    if (!currentSelectedChat) return;

    if (currentSelectedChat.isGroup) {
      // Join the group room so you can receive messages
      socket.emit("joinGroup", currentSelectedChat._id);

      socket.on("newGroupMessage", (newMessage) => {
        if (newMessage.groupId.toString() === currentSelectedChat._id.toString()) {
          const formattedMessage = {
            ...newMessage,
            senderId: {
              _id: newMessage.senderId._id || newMessage.senderId,
              fullName: newMessage.senderId.fullName || "Unknown",
              profilePic: newMessage.senderId.profilePic || "/avatar.png",
            },
          };
          set((state) => ({
            messages: [...state.messages, formattedMessage],
          }));
        }
      });
    }

    // Listen for the private AI response
    socket.on("newAIResponse", (aiMessage) => {
      console.log("AI response received:", aiMessage);
      set({ isAiReturned: true });

      const formattedAiMessage = {
        ...aiMessage,
        senderId: {
          _id: aiMessage.senderId._id || aiMessage.senderId,
          fullName: aiMessage.senderId.fullName || "Aria (AI)",
          profilePic: aiMessage.senderId.profilePic || "/ai-avatar.png",
        },
      };

      set((state) => {
        const alreadyExists = state.messages.some((msg) => msg._id === aiMessage._id);
        if (alreadyExists) return state;

        return {
          messages: [...state.messages, formattedAiMessage],
        };
      });
    });

    // Optionally, if you support direct messages:
    socket.on("newMessage", (newMessage) => {
      if (!currentSelectedChat.isGroup && newMessage.senderId === currentSelectedChat._id) {
        set((state) => ({ messages: [...state.messages, newMessage] }));
      }
    });
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    socket.off("newMessage");
    socket.off("newGroupMessage");
    socket.off("newAIResponse");
  },

  setSelectedChat: async (chat) => {
    const { authUser } = useAuthStore.getState();

    if (chat.isGroup && !chat.members.some(member =>
      (typeof member === "object" ? member._id : member) === authUser._id
    )) {
      toast.error("You are not a member of this group.");
      return;
    }

    if (chat.isGroup && !chat.members[0]?.fullName) {
      try {
        const res = await axiosInstance.get(`/groups/${chat._id}`);
        chat = res.data;
      } catch (error) {

      }
    }

    set({ selectedChat: { ...chat, isGroup: chat.isGroup || false } });
    get().getMessages();
  },

  resetChatState: () => set({ selectedChat: null, messages: [] }),
}));
