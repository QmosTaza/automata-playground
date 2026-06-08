"use client"

import { useState, useRef, useMemo, useCallback } from "react"
import AutomataTabs from "@/components/automata/AutomataTabs"
import AutomataCanvas from "@/components/automata/AutomataCanvas"
import { generateId } from "@/core/shared"

//machine example
function createExampleFA(id: string, name: string) {
  const q0Id = generateId();
  const q1Id = generateId();

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
      { id: generateId(), from: q0Id, to: q1Id, symbol: "a" },
      { id: generateId(), from: q0Id, to: q1Id, symbol: "b" },
      { id: generateId(), from: q1Id, to: q1Id, symbol: "a" }
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

export default function Home() {
  // tracks simple metadata for tabs at the top level
  const [activeTabId, setActiveTabId] = useState<string>("tab-initial")
  const [tabs, setTabs] = useState<Array<{ id: string }>>([
    { id: "tab-initial"}
  ])

  const [automataCollection, setAutomataCollection] = useState<Record<string, any>>({
    "tab-initial": createExampleFA("tab-initial", "DFA 1")
  })

  //active tab view slot here
  const currentAutomaton = automataCollection[activeTabId] || automataCollection[tabs[0].id]

  const canvasSaveRef = useRef<(() => any) | null>(null);

  // This handles switching tabs, but forces a manual save of the outgoing tab FIRST
  const handleSelectTab = (nextTabId: string) => {
    if (nextTabId === activeTabId) return;

    // Ask the canvas for its absolute latest data right now
    if (canvasSaveRef.current) {
      const latestFaData = canvasSaveRef.current();
      if (latestFaData) {
        setAutomataCollection(prev => ({
          ...prev,
          [activeTabId]: latestFaData
        }));
      }
    }
    
    // change the tab safely
    setActiveTabId(nextTabId);
  }

  //ADD
  const handleAddTab = () => {
    const newId = `tab-${Date.now()}`
    const newName = `Automaton ${tabs.length + 1}`
    const newAutomaton = createEmptyAutomaton(newId, newName)

    setAutomataCollection(prev => ({ ...prev, [newId]: newAutomaton }))
    setTabs([...tabs, { id: newId }])
    setActiveTabId(newId)
  }

  //DELETE
  const handleDeleteTab = (idToDelete: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (tabs.length === 1) return

    const nextTabs = tabs.filter(t => t.id !== idToDelete)
    setTabs(nextTabs)

    setAutomataCollection(prev => {
      const updated = { ...prev }
      delete updated[idToDelete]
      return updated
    })

    if (activeTabId === idToDelete) {
      const currentIndex = tabs.findIndex(t => t.id === idToDelete)
      setActiveTabId(nextTabs[Math.max(0, currentIndex - 1)].id)
    }
  }

  //CHANGES FROM CANVAS HERE
  const handleCanvasChange = (updatedFa: any) => {
    if (!updatedFa) return;
    setAutomataCollection(prev => ({
      ...prev,
      [activeTabId]: updatedFa
    }));
  };

  // Updates the tab name with the automaton name
  const handleLiveRename = useCallback((newName: string) => {
    setAutomataCollection(prev => {
      if (prev[activeTabId]?.name === newName) return prev;
      
      return {
        ...prev,
        [activeTabId]: {
          ...prev[activeTabId],
          name: newName
        }
      };
    });
  }, [activeTabId]);


  // converts metadata into the Project structural format Tab component expects
  const projectedProject = useMemo(() => ({
    activeAutomataId: activeTabId,
    tabsOrder: tabs.map(t => t.id),
    automata: automataCollection
  }), [activeTabId, tabs, automataCollection]);

  return (
    <main className="w-screen h-screen flex flex-col bg-stone-50 overflow-hidden select-none">
      {/* Global Navigation */}
      <AutomataTabs
        project={projectedProject}
        onSelectTab={handleSelectTab}
        onAddTab={handleAddTab}
        onDeleteTab={handleDeleteTab}
      />

      {/* Main Interactive Studio Canvas Container */}
      <div className="flex-1 w-full relative overflow-hidden">
        <AutomataCanvas 
          activeData={currentAutomaton} 
          onSave={handleCanvasChange}
          onLiveRename={handleLiveRename}
          saveHookRef={canvasSaveRef}
        />
      </div>
    </main>
  )
}