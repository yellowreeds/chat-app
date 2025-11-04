import { useEffect, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import SidebarSkeleton from "./skeletons/SidebarSkeleton";
import { Users, UsersRound, ToggleRight, ToggleLeft, Plus } from "lucide-react";
import CreateGroupModal from "./CreateGroupModal"; // Import the modal

const Sidebar = () => {
  const { getUsers, getGroups, users, groups, selectedChat, setSelectedChat, isUsersLoading, isGroupsLoading } = useChatStore();
  const { onlineUsers } = useAuthStore();
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false); // Modal state

  useEffect(() => {
    getUsers();
    getGroups();
  }, [getUsers, getGroups]);

  const filteredUsers = showOnlineOnly
    ? users.filter((user) => onlineUsers.includes(user._id))
    : users;

  if (isUsersLoading || isGroupsLoading) return <SidebarSkeleton />;

  return (
    <>
      <aside className="h-full w-20 lg:w-72 border-r border-base-300 flex flex-col transition-all duration-200">
        {/* Sidebar Header */}
        <div className="border-b border-base-300 w-full p-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="size-6" />
            <span className="font-medium hidden lg:block">Chats</span>
          </div>
          <button
            className="hidden lg:flex items-center gap-2 text-gray-500 hover:text-gray-700 transition"
            onClick={() => setShowOnlineOnly(!showOnlineOnly)}
          >
            {showOnlineOnly ? <ToggleRight className="size-5 text-green-500" /> : <ToggleLeft className="size-5" />}
            <span className="text-sm">Online Only</span>
          </button>
        </div>

        <div className="overflow-y-auto w-full py-3">
          {/* Groups Section with "Add Group" Button */}
          <div className="flex items-center justify-between px-3">
            <h3 className="text-sm font-semibold text-gray-500 mt-3">Groups</h3>
            <button
              onClick={() => setIsModalOpen(true)}
              className="text-primary hover:opacity-80 flex items-center gap-1"
            >
              <Plus className="size-5" />
            </button>
          </div>

          {groups.length > 0 && (
            <>
              {groups.map((group) => (
                <button
                  key={group._id}
                  onClick={() => setSelectedChat(group)}
                  className={`w-full p-3 flex items-center gap-3 hover:bg-base-300 transition-colors ${
                    selectedChat?._id === group._id ? "bg-base-300 ring-1 ring-base-300" : ""
                  }`}
                >
                  <UsersRound className="size-12 text-blue-500" />
                  <div className="hidden lg:block text-left">
                    <div className="font-medium truncate">{group.name}</div>
                  </div>
                </button>
              ))}
            </>
          )}

          {/* Users Section */}
          {filteredUsers.length > 0 && (
            <>
              <h3 className="text-sm font-semibold text-gray-500 px-3 mt-3">Users</h3>
              {filteredUsers.map((user) => (
                <button
                  key={user._id}
                  onClick={() => setSelectedChat(user)}
                  className={`w-full p-3 flex items-center gap-3 hover:bg-base-300 transition-colors ${
                    selectedChat?._id === user._id ? "bg-base-300 ring-1 ring-base-300" : ""
                  }`}
                >
                  <img src={user.profilePic || "/avatar.png"} alt={user.name} className="size-12 object-cover rounded-full" />
                  <div className="hidden lg:block text-left">
                    <div className="font-medium truncate">{user.fullName}</div>
                    <div className="text-sm text-gray-500">
                      {onlineUsers.includes(user._id) ? "Online" : "Offline"}
                    </div>
                  </div>
                </button>
              ))}
            </>
          )}
        </div>
      </aside>

      {/* Render the Create Group Modal */}
      {isModalOpen && <CreateGroupModal onClose={() => setIsModalOpen(false)} />}
    </>
  );
};

export default Sidebar;
