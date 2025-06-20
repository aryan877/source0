export type Shortcut = {
  id: "search" | "new-chat" | "toggle-sidebar";
  name: string;
  key: string;
  display: string[];
  mod: boolean;
  shift: boolean;
};

export const SHORTCUTS: Shortcut[] = [
  {
    id: "search",
    name: "Search",
    key: "k",
    display: ["⌘", "K"],
    mod: true,
    shift: false,
  },
  {
    id: "new-chat",
    name: "New Chat",
    key: "o",
    display: ["⌘", "Shift", "O"],
    mod: true,
    shift: true,
  },
  {
    id: "toggle-sidebar",
    name: "Toggle Sidebar",
    key: "b",
    display: ["⌘", "B"],
    mod: true,
    shift: false,
  },
];
