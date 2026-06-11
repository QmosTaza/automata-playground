"use client"

import { useState, useEffect, useRef, useMemo, useCallback } from "react"
import AutomataTabs from "@/components/AutomataTabs"
import AutomataCanvas from "@/components/automata/AutomataCanvas"
import WorkspaceToolbar from "@/components/WorkspaceToolbar"
import { generateId } from "@/core/shared"
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { Project } from "@/types"
import HelpGuide from "@/components/HelpGuide"

//machine example
function createExampleFA(id: string, name: string) {
  const q0Id = `${id}-q0`;
  const q1Id = `${id}-q1`;

  return {
    id: id,
    name: name,
    createdAt: Date.now(),
    states: {
      [q0Id]: { id: q0Id, label: "q0", x: 100, y: 100 },
      [q1Id]: { id: q1Id, label: "q1", x: 300, y: 100 }
    },
    alphabet: ["a", "b"],
    transitions: [
      { id: `${id}-t0`, from: q0Id, to: q1Id, symbol: "a" },
      { id: `${id}-t1`, from: q0Id, to: q1Id, symbol: "b" },
      { id: `${id}-t2`, from: q1Id, to: q1Id, symbol: "a" }
    ],
    startStates: [q0Id],
    acceptStates: [q1Id],
    kind: "dfa" as const
  }
};
// empty tab layout fallback creator
function createEmptyAutomaton(id: string, name: string) {
  return {
    id,
    name,
    kind: "dfa" as const,
    createdAt: Date.now(),
    states: {},
    alphabet: ["a", "b"],
    transitions: [],
    startStates: [],
    acceptStates: [],
    regex: ""
  };
}

const INITIAL_PROJECT_STATE: Project = {
  activeAutomataId: "tab-initial",
  tabsOrder: ["tab-initial"],
  automata: {
    "tab-initial": createExampleFA("tab-initial", "DFA 1")
  }
};

export default function Home() {
  const [project, setProject] = useLocalStorage<Project>("automata_studio_project_v1", INITIAL_PROJECT_STATE);
  
  const canvasKey = project.activeAutomataId;

  //Help button -> Opens how to use
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  // Next.js Hydration Guard
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  //active tab view slot here
  const currentAutomaton = useMemo(() => {
    const activeId = project.activeAutomataId;
    return project.automata[activeId] || project.automata[project.tabsOrder[0]];
  }, [project.activeAutomataId, project.automata]);

  const canvasSaveRef = useRef<(() => any) | null>(null);

  // Saves the canvas data to memory
  const saveActiveCanvasToMemory = useCallback(() => {
    const latest = canvasSaveRef.current?.();
    if (!latest) return;

    setProject(prev => ({
      ...prev,
      automata: {
        ...prev.automata,
        [prev.activeAutomataId]: latest
      }
    }));
  }, [setProject]);

  /*
  useEffect(() => {
    const id = setInterval(saveActiveCanvasToMemory, 500);
    return () => clearInterval(id);
  }, [saveActiveCanvasToMemory]);
  */

  const saveTimeout = useRef<NodeJS.Timeout | null>(null);

  const scheduleSave = useCallback(() => {
    if (saveTimeout.current) clearTimeout(saveTimeout.current);

    saveTimeout.current = setTimeout(() => {
      const latest = canvasSaveRef.current?.();
      if (!latest) return;

      setProject(prev => ({
        ...prev,
        automata: {
          ...prev.automata,
          [prev.activeAutomataId]: latest
        }
      }));
    }, 300);
  }, [setProject]);

  // This handles switching tabs, but forces a manual save of the outgoing tab FIRST
  const handleSelectTab = (nextTabId: string) => {
    if (nextTabId === project.activeAutomataId) return;
    const oldTabId = project.activeAutomataId;

    if (canvasSaveRef.current) {
      const latestFa = canvasSaveRef.current();
      if (latestFa) {
        setProject(prev => ({
          ...prev,
          automata: {
            ...prev.automata,
            [oldTabId]: latestFa
          },
          activeAutomataId: nextTabId
        }));
        return;
      }
    }
    setProject(prev => ({ ...prev, activeAutomataId: nextTabId }));
  };

  //ADD
  const handleAddTab = () => {
    saveActiveCanvasToMemory();
    const newId = `tab-${Date.now()}`;
    const newName = `Automaton ${project.tabsOrder.length + 1}`;
    const newAutomaton = createEmptyAutomaton(newId, newName);

    setProject(prev => ({
      ...prev,
      tabsOrder: [...prev.tabsOrder, newId],
      automata: { ...prev.automata, [newId]: newAutomaton },
      activeAutomataId: newId
    }));
  }

  //DELETE
  const handleDeleteTab = (idToDelete: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (project.tabsOrder.length === 1) return;

    setProject(prev => {
      const nextTabsOrder = prev.tabsOrder.filter(id => id !== idToDelete);
      const nextAutomata = { ...prev.automata };
      delete nextAutomata[idToDelete];

      let nextActiveId = prev.activeAutomataId;
      if (prev.activeAutomataId === idToDelete) {
        const currentIndex = prev.tabsOrder.indexOf(idToDelete);
        nextActiveId = nextTabsOrder[Math.max(0, currentIndex - 1)];
      }

      return {
        activeAutomataId: nextActiveId,
        tabsOrder: nextTabsOrder,
        automata: nextAutomata
      };
    });
  }

  //CHANGES FROM CANVAS HERE
  const handleCanvasChange = useCallback((updatedFa: any) => {
    if (!updatedFa || !updatedFa.id) return;

    setProject(prev => {
      if (!prev.tabsOrder.includes(updatedFa.id)) {
        return prev;
      }

      const nextAutomata = { ...prev.automata };
      nextAutomata[updatedFa.id] = {
        ...updatedFa,
        states: { ...updatedFa.states },
        transitions: [...updatedFa.transitions]
      };

      return {
        ...prev,
        automata: nextAutomata
      };
    });
  }, [setProject]);

  // Updates the tab name with the automaton name
  const handleLiveRename = useCallback((newName: string) => {
    setProject(prev => {
      const currentActive = prev.automata[prev.activeAutomataId];
      if (currentActive?.name === newName) return prev;

      return {
        ...prev,
        automata: {
          ...prev.automata,
          [prev.activeAutomataId]: {
            ...currentActive,
            name: newName
          }
        }
      };
    });
  }, [setProject]);

  // EXPORT FILE (.json)
  const handleExportProject = () => {
    // Get the absolute newest data directly from the canvas execution ref right now
    let latestAutomataCollection = project.automata;

    if (canvasSaveRef.current) {
      const latestFaData = canvasSaveRef.current();
      if (latestFaData && latestFaData.id) {
        latestAutomataCollection = {
          ...project.automata,
          [latestFaData.id]: latestFaData
        };
      }
    }

    // Build the exact payload manually using the freshest snapshot
    const exactProjectPayload = {
      activeAutomataId: project.activeAutomataId,
      tabsOrder: project.tabsOrder,
      automata: latestAutomataCollection
    };

    // Force download instantly 
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exactProjectPayload));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `automata_project_${Date.now()}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  // IMPORT FILE
  const handleImportProject = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    const file = e.target.files?.[0];
    if (!file) return;

    fileReader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);

        if (parsed && parsed.activeAutomataId && Array.isArray(parsed.tabsOrder) && parsed.automata) {

          // Clear any canvas refs to prevent outgoing components from firing uncommitted saves
          if (canvasSaveRef.current) {
            canvasSaveRef.current = null;
          }

          // Commit the imported data directly to storage & state
          setProject(parsed);

          // Force a micro-render buffer sequence to let React Flow unmount safely
          alert("Project imported successfully! :)");
        } else {
          alert("Invalid project schema file configuration.");
        }
      } catch (err) {
        alert("Failed to parse JSON file structure cleanly.");
      }
    };

    fileReader.readAsText(file);

    // Clear input value so selecting the same file back-to-back works
    e.target.value = "";
  };

  // RESET ESCAPE HATCH 
  const handleClearWorkspace = () => {
    if (window.confirm("Clear all workspaces? This completely wipes the browser storage state.")) {
      window.localStorage.removeItem("automata_studio_project_v1");
      window.location.reload();
    }
  }



  // Prevent Next.js from rendering server components before loading localStorage
  if (!isMounted) {
    return (
      <div className="w-screen h-screen bg-stone-50 flex items-center justify-center">
        <div className="animate-pulse text-stone-400">Loading workspace...</div>
      </div>
    );
  }

  return (
    <main className="w-screen h-screen flex flex-col bg-stone-50 overflow-hidden select-none">
      {/* Utility Bar for Persistence Operations */}
      <WorkspaceToolbar
        onExport={handleExportProject}
        onImport={handleImportProject}
        onClear={handleClearWorkspace}
      />


      {/* Global Navigation */}
      <AutomataTabs
        project={project}
        onSelectTab={handleSelectTab}
        onAddTab={handleAddTab}
        onDeleteTab={handleDeleteTab}
        setIsHelpOpen={setIsHelpOpen}
      />

      {/* Main Interactive Studio Canvas Container */}
      <div className="flex-1 w-full relative overflow-hidden">
        <AutomataCanvas
          key={canvasKey}
          activeData={currentAutomaton}
          onSave={handleCanvasChange}
          onLiveRename={handleLiveRename}
          saveHookRef={canvasSaveRef}
          scheduleSave={scheduleSave}
        />
      </div>
      <HelpGuide
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
      />
    </main>
  )
}