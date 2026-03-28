export interface SceneGraph {
  title: string;
  characters: Character[];
  scenes: Scene[];
}

export interface Character {
  id: string;
  name: string;
  description: string;
  image_prompt: string;
  image_url: string | null;
}

export interface Scene {
  id: string;
  location: string;
  time_of_day: string;
  mood: string;
  background_prompt: string;
  background_url: string | null;
  dialogue: DialogueLine[];
  next_scene: string | null;
}

export interface DialogueLine {
  speaker: string; // character id or "narrator"
  text: string;
}
