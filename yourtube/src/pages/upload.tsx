"use client";

import React from "react";
import { useRouter } from "next/router";
import { useUser } from "@/lib/AuthContext";
import { useLanguage } from "@/lib/LanguageContext";
import VideoUploader from "@/components/VideoUploader";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import Head from "next/head";

const UploadPage = () => {
  const { user, authLoading } = useUser();
  const { t } = useLanguage();
  const router = useRouter();

  if (authLoading) {
    return <div className="flex-1 p-6">Loading...</div>;
  }

  if (!user) {
    return (
      <div className="flex-1 p-6">
        <Head>
          <title>Upload Video | YourTube</title>
        </Head>
        <div className="max-w-3xl mx-auto bg-card/95 border border-border rounded-3xl p-8 shadow-sm">
          <h1 className="text-2xl font-semibold mb-4">Sign in to upload videos</h1>
          <p className="text-sm text-muted-foreground mb-6">
            You need to be signed in to publish content on YourTube.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button onClick={() => router.push("/auth/login")}>Sign in</Button>
            <Link href="/auth/signup">
              <Button variant="outline">Create account</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="flex-1 p-6">
      <Head>
        <title>Upload Video | YourTube</title>
      </Head>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold">{t("uploadTitle", "Upload your video")}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {t(
                "uploadDescription",
                "Add a title, description, category, and publish your video to your channel."
              )}
            </p>
          </div>
          <div className="space-y-2 text-right">
            <p className="text-sm text-muted-foreground">Uploading with</p>
            <p className="font-medium">{user.channelname || user.name}</p>
          </div>
        </div>
        <VideoUploader channelId={user._id} channelName={user.channelname || user.name} />
      </div>
    </main>
  );
};

export default UploadPage;
