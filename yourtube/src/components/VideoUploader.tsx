import { Check, FileVideo, Upload, X } from "lucide-react";
import React, { ChangeEvent, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Progress } from "./ui/progress";
import axiosInstance from "@/lib/axiosinstance";

const VideoUploader = ({ channelId, channelName }: any) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoTitle, setVideoTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("General");
  const [tags, setTags] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreviewUrl, setThumbnailPreviewUrl] = useState("");
  const [visibility, setVisibility] = useState("public");
  const [uploadComplete, setUploadComplete] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlefilechange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (!file.type.startsWith("video/")) {
        toast.error("Please upload a valid video file.");
        return;
      }
      if (file.size > 100 * 1024 * 1024) {
        toast.error("File size exceeds 100MB limit.");
        return;
      }
      setVideoFile(file);
      const filename = file.name;
      if (!videoTitle) {
        setVideoTitle(filename);
      }
    }
  };

  const handleThumbnailChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (!file.type.startsWith("image/")) {
        toast.error("Please upload a valid image thumbnail.");
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error("Thumbnail exceeds 10MB limit.");
        return;
      }
      setThumbnailFile(file);
      setThumbnailUrl("");
      const preview = URL.createObjectURL(file);
      setThumbnailPreviewUrl(preview);
    }
  };

  const resetForm = () => {
    setVideoFile(null);
    setVideoTitle("");
    setDescription("");
    setCategory("General");
    setTags("");
    setThumbnailUrl("");
    setThumbnailFile(null);
    setThumbnailPreviewUrl("");
    setVisibility("public");
    setIsUploading(false);
    setUploadProgress(0);
    setUploadComplete(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const cancelUpload = () => {
    if (isUploading) {
      toast.error("Your video upload has been cancelled");
      return;
    }
    resetForm();
  };

  const handleUpload = async () => {
    if (!videoFile || !videoTitle.trim()) {
      toast.error("Please provide file and title");
      return;
    }
    const formdata = new FormData();
    formdata.append("file", videoFile);
    formdata.append("videotitle", videoTitle);
    formdata.append("description", description);
    formdata.append("category", category);
    formdata.append("tags", tags);
    formdata.append("visibility", visibility);
    formdata.append("videochanel", channelName);
    formdata.append("uploader", channelId);

    if (thumbnailFile) {
      formdata.append("thumbnailFile", thumbnailFile);
    } else if (thumbnailUrl.trim()) {
      formdata.append("thumbnail", thumbnailUrl.trim());
    }

    try {
      setIsUploading(true);
      setUploadProgress(0);
      await axiosInstance.post("/videos/upload", formdata, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        onUploadProgress: (progresEvent: any) => {
          const progress = Math.round(
            (progresEvent.loaded * 100) / progresEvent.total
          );
          setUploadProgress(progress);
        },
      });
      toast.success("Upload successfully");
      resetForm();
    } catch (error) {
      console.error("Error uploading video:", error);
      toast.error("There was an error uploading your video. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="bg-card rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-4 text-foreground">Upload a video</h2>

      <div className="space-y-4">
        {!videoFile ? (
          <div
            className="border-2 border-dashed border-border border-slate-300 rounded-lg p-8 text-center cursor-pointer hover:bg-muted transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
            <p className="text-lg font-medium text-foreground">
              Drag and drop video files to upload
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              or click to select files
            </p>
            <p className="text-xs text-muted-foreground mt-4">
              MP4, WebM, MOV or AVI • Up to 100MB
            </p>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="video/*"
              onChange={handlefilechange}
            />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-card rounded-lg border border-border">
              <div className="bg-blue-100 p-2 rounded-md">
                <FileVideo className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate text-foreground">{videoFile.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(videoFile.size / (1024 * 1024)).toFixed(2)} MB
                </p>
              </div>
              {!isUploading && (
                <Button variant="ghost" size="icon" onClick={cancelUpload}>
                  <X className="w-5 h-5" />
                </Button>
              )}
              {uploadComplete && (
                <div className="bg-green-100 p-1 rounded-full">
                  <Check className="w-5 h-5 text-green-600" />
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <Label htmlFor="title" className="text-foreground">Title (required)</Label>
                <Input
                  id="title"
                  value={videoTitle}
                  onChange={(e) => setVideoTitle(e.target.value)}
                  placeholder="Add a title that describes your video"
                  disabled={isUploading || uploadComplete}
                  className="mt-1 bg-card text-foreground border border-slate-300 focus-visible:ring-2 focus-visible:ring-sky-500"
                />
              </div>
              <div>
                <Label htmlFor="description" className="text-foreground">Description</Label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add a detailed description for your video"
                  disabled={isUploading || uploadComplete}
                  className="w-full rounded-md border border-slate-300 bg-card text-foreground placeholder:text-muted-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  rows={4}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="category" className="text-foreground">Category</Label>
                  <Input
                    id="category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="General"
                    disabled={isUploading || uploadComplete}
                    className="mt-1 bg-card text-foreground border border-slate-300 focus-visible:ring-2 focus-visible:ring-sky-500"
                  />
                </div>
                <div>
                  <Label htmlFor="visibility" className="text-foreground">Visibility</Label>
                  <select
                    id="visibility"
                    value={visibility}
                    onChange={(e) => setVisibility(e.target.value)}
                    disabled={isUploading || uploadComplete}
                    className="mt-1 w-full rounded-md border border-slate-300 bg-card text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option className="bg-card text-foreground" value="public">Public</option>
                    <option className="bg-card text-foreground" value="unlisted">Unlisted</option>
                    <option className="bg-card text-foreground" value="private">Private</option>
                  </select>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="thumbnailFile" className="text-foreground">Upload custom thumbnail</Label>
                  <input
                    id="thumbnailFile"
                    type="file"
                    accept="image/*"
                    onChange={handleThumbnailChange}
                    disabled={isUploading || uploadComplete}
                    className="mt-1 w-full rounded-md border border-slate-300 bg-card text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  {thumbnailPreviewUrl && (
                    // preview may be a local object URL; using native <img> here
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={thumbnailPreviewUrl}
                      alt="Thumbnail preview"
                      className="mt-3 w-full max-h-48 object-cover rounded-md border border-border"
                    />
                  )}
                </div>
                <div>
                  <Label htmlFor="thumbnail" className="text-foreground">Or thumbnail URL</Label>
                  <Input
                    id="thumbnail"
                    value={thumbnailUrl}
                    onChange={(e) => setThumbnailUrl(e.target.value)}
                    placeholder="Optional thumbnail image URL"
                    disabled={isUploading || uploadComplete}
                    className="mt-1 bg-card text-foreground border border-slate-300 focus-visible:ring-2 focus-visible:ring-sky-500"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Optional custom thumbnail. Image upload takes priority over the URL.
                  </p>
                </div>
              </div>
            </div>

            {isUploading && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-foreground">
                  <span>Uploading...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="h-2" />
              </div>
            )}

            <div className="flex justify-end gap-3">
              {!uploadComplete && (
                <>
                  <Button onClick={cancelUpload} disabled={uploadComplete}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleUpload}
                    disabled={
                      isUploading || !videoTitle.trim() || uploadComplete
                    }
                  >
                    {isUploading ? "Uploading..." : "Upload"}
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoUploader;
