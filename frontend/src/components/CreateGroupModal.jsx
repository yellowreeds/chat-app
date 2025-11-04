import { useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { X } from "lucide-react";

const CreateGroupModal = ({ onClose }) => {
  const { users, createGroup } = useChatStore();
  const [groupName, setGroupName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState([]);

  const handleToggleMember = (userId) => {
    setSelectedMembers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedMembers.length === 0) return;
    await createGroup({ name: groupName, members: selectedMembers });
    onClose();
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-1">
      <div className="bg-base-200 p-6 rounded-lg w-80">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">Create New Group</h2>
          <button onClick={onClose}>
            <X className="size-5" />
          </button>
        </div>

        {/* Group Name Input */}
        <input
          type="text"
          className="input input-bordered w-full mb-4"
          placeholder="Enter group name..."
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
        />

        {/* Members List */}
        <h3 className="text-sm font-semibold mb-2">Select Members</h3>
        <div className="max-h-40 overflow-y-auto border rounded p-2">
          {users.map((user) => (
            <label key={user._id} className="flex items-center gap-2 p-2 hover:bg-base-300 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedMembers.includes(user._id)}
                onChange={() => handleToggleMember(user._id)}
              />
              {user.fullName}
            </label>
          ))}
        </div>

        {/* Create Group Button */}
        <button
          className="btn btn-primary w-full mt-4"
          onClick={handleCreateGroup}
          disabled={!groupName.trim() || selectedMembers.length === 0}
        >
          Create Group
        </button>
      </div>
    </div>
  );
};

export default CreateGroupModal;
