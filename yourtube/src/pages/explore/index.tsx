import Videogrid from "@/components/Videogrid";

export default function ExplorePage() {
  return (
    <main className="flex-1 p-4">
      <h1 className="text-2xl font-bold mb-4">Explore</h1>
      <p className="text-gray-600 mb-6">Discover trending videos on YourTube.</p>
      <Videogrid />
    </main>
  );
}
