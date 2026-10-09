import React from 'react';
import Head from 'next/head';
import Videogrid from '@/components/Videogrid';

export default function Home() {
  return (
    <>
      <Head>
        <title>YourTube - Video Platform</title>
        <meta name="description" content="Discover and share amazing videos on YourTube" />
      </Head>
      <main className="flex-1 overflow-auto">
        <div className="p-6">
          <h1 className="text-3xl font-bold mb-6">Welcome to YourTube</h1>
          <Videogrid />
        </div>
      </main>
    </>
  );
}
