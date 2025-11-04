import { useRef, useState, useEffect } from "react";
import { useChatStore } from "../store/useChatStore";
import { Image, Send, X } from "lucide-react";
import toast from "react-hot-toast";

const MessageInput = () => {
  const [text, setText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef(null);
  const { sendMessage, isAiReturned, setAiReturned } = useChatStore();

  useEffect(() => {
    if (isAiReturned) {
      setIsLoading(false);
      setText("");
      setAiReturned(false); // ✅ Reset AI state
    }
  }, [isAiReturned]);

  const [filePreview, setFilePreview] = useState(null); // can be image or other file

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const isImage = file.type.startsWith("image/");

    const reader = new FileReader();
    reader.onloadend = () => {
      setFilePreview({
        name: file.name,
        type: file.type,
        dataUrl: reader.result,
        file, // 👈 keep original file for FormData
        isImage,
      });
    };

    reader.readAsDataURL(file);
  };

  const removeFile = () => {
    setFilePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!text.trim() && !filePreview) return;

    const isAIMessage = text.trim().startsWith("@aria/");

    if (isAIMessage) {
      setIsLoading(true);
      setText("Loading...");
      setAiReturned(false);
    }

    try {
      let messageData;

      // 🖼️ If image → use base64
      if (filePreview?.isImage) {
        messageData = {
          text: text.trim(),
          image: filePreview.dataUrl,
        };
      }
      // 📄 If file → use FormData
      else if (filePreview?.file) {
        messageData = {
          text: text.trim(),
          file: filePreview.file, // pass raw file object
        };
      }
      // ✏️ If just text
      else {
        messageData = {
          text: text.trim(),
        };
      }

      await sendMessage(messageData); // 🧠 your store handles route decision

      if (!isAIMessage) {
        setText("");
        setFilePreview(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      setIsLoading(false);
    }
  };


  return (
    <div className="p-4 w-full">
      {filePreview && (
        <div className="mb-3 flex items-center gap-2">
          {filePreview.isImage ? (
            <div className="relative">
              <img
                src={filePreview.dataUrl}
                alt="Preview"
                className="w-20 h-20 object-cover rounded-lg border border-zinc-700"
              />
              <button
                onClick={removeFile}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-base-300
              flex items-center justify-center"
                type="button"
              >
                <X className="size-3" />
              </button>
            </div>
          ) : (
            <div className="bg-zinc-800 text-white p-2 rounded border">
              📎 {filePreview.name}
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSendMessage} className="flex items-center gap-2">
        <div className="flex-1 flex gap-2">
          <input
            type="text"
            className="w-full input input-bordered rounded-lg input-sm sm:input-md"
            placeholder="Type a message..."
            value={text}
            onChange={(e) => !isLoading && setText(e.target.value)}
            disabled={isLoading}
          />
          <input
            type="file"
            accept=".png,.jpg,.jpeg,.pdf,.docx,.csv"
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileChange}
          />
          <button
            type="button"
            className={`hidden sm:flex btn btn-circle ${filePreview ? "text-emerald-500" : "text-zinc-400"}`}
            onClick={() => fileInputRef.current?.click()}
          >
            <Image size={20} />
          </button>
        </div>
        <button
          type="submit"
          className="btn btn-sm btn-circle"
          disabled={isLoading || (!text.trim() && !filePreview)}
        >
          <Send size={22} />
        </button>
      </form>
    </div>
  );
};
export default MessageInput;
