import { create } from "zustand";
import { axiosInstance } from "../lib/axios.js";
import toast from "react-hot-toast";
import { io } from "socket.io-client";
import { useChatStore } from "./useChatStore.js";

const BASE_URL = "http://localhost:5001";

export const useAuthStore = create((set, get) => ({
    authUser: null,
    isSigningUp: false,
    isLoggingIn: false,
    isUpdatingProfile: false,
    isCheckingAuth: true,
    onlineUsers: [],
    socket: null,

    /* -------------------------------------------------------------------------- */
    /* 🧠 Check if user session still valid (optional, token-based)               */
    /* -------------------------------------------------------------------------- */
    checkAuth: async () => {
        try {
            const token = localStorage.getItem("jwt");
            if (!token) throw new Error("No token found");

            const res = await axiosInstance.get("/auth/check", {
                headers: { Authorization: `Bearer ${token}` },
            });

            set({ authUser: res.data.data });
            get().connectSocket();
        } catch (error) {
            console.log("Error in checkAuth:", error);
            set({ authUser: null });
        } finally {
            set({ isCheckingAuth: false });
        }
    },

    /* -------------------------------------------------------------------------- */
    /* 📝 Sign up new user                                                       */
    /* -------------------------------------------------------------------------- */
    signUp: async (data) => {
        set({ isSigningUp: true });
        try {
            const res = await axiosInstance.post("/auth/signup", data);
            const { token, user } = res.data;

            localStorage.setItem("jwt", token);
            set({ authUser: user });
            toast.success("Account created successfully!");
            get().connectSocket();
        } catch (error) {
            toast.error(error.response?.data?.message || "Signup failed");
        } finally {
            set({ isSigningUp: false });
        }
    },

    /* -------------------------------------------------------------------------- */
    /* 🔑 Login existing user                                                    */
    /* -------------------------------------------------------------------------- */
    login: async (data) => {
        set({ isLoggingIn: true });
        try {
            const res = await axiosInstance.post("/auth/login", data);
            const { token, user } = res.data;

            localStorage.setItem("jwt", token);
            set({ authUser: user });
            toast.success("Logged in successfully!");
            get().connectSocket();
        } catch (error) {
            toast.error(error.response?.data?.message || "Login failed");
        } finally {
            set({ isLoggingIn: false });
        }
    },

    /* -------------------------------------------------------------------------- */
    /* 🚪 Log out                                                               */
    /* -------------------------------------------------------------------------- */
    logOut: async () => {
        try {
            await axiosInstance.post("/auth/logout");
        } catch (_) {
            /* ignore backend logout errors */
        } finally {
            localStorage.removeItem("jwt");
            set({ authUser: null });
            useChatStore.getState().resetChatState();
            get().disconnectSocket();
            toast.success("Logged out successfully");
        }
    },

    /* -------------------------------------------------------------------------- */
    /* 🧑‍🎨 Update user profile                                                 */
    /* -------------------------------------------------------------------------- */
    updateProfile: async (data) => {
        set({ isUpdatingProfile: true });
        try {
            const token = localStorage.getItem("jwt");
            const res = await axiosInstance.put("/auth/update-profile", data, {
                headers: { Authorization: `Bearer ${token}` },
            });

            set({ authUser: res.data.data });
            toast.success("Profile updated successfully!");
        } catch (error) {
            console.error("Error in updateProfile:", error);
            toast.error(error.response?.data?.message || "Update failed");
        } finally {
            set({ isUpdatingProfile: false });
        }
    },

    /* -------------------------------------------------------------------------- */
    /* 🔌 Socket Connection (JWT-based, no cookies)                              */
    /* -------------------------------------------------------------------------- */
    connectSocket: () => {
        const { authUser } = get();
        if (!authUser || get().socket?.connected) return;

        const token = localStorage.getItem("jwt");
        if (!token) {
            console.warn("⚠️ No JWT token found — skipping socket connect");
            return;
        }

        const socket = io(BASE_URL, {
            auth: { token },
            transports: ["websocket"],
        });

        socket.on("connect", () => {
            console.log(`🔌 Socket connected as ${authUser.fullName}`);
        });

        socket.on("getOnlineUsers", (userIds) => {
            set({ onlineUsers: userIds });
        });

        socket.connect();
        set({ socket });
    },

    disconnectSocket: () => {
        const socket = get().socket;
        if (socket?.connected) {
            socket.disconnect();
            set({ socket: null });
            console.log("🔌 Socket disconnected");
        }
    },
}));