import {useCallback, useRef, useState} from "react";

/**
 * Undo/redo history for a value of type T.
 * `set(next, commit)` with commit=false replaces the present without pushing
 * history (used while dragging); pass commit=true (default) to snapshot a
 * checkpoint, e.g. once a drag/resize interaction ends.
 */
export function useHistory<T>(initial:T){
  const [present,setPresentState]=useState<T>(initial);
  const presentRef=useRef(initial);
  const past=useRef<T[]>([]);
  const future=useRef<T[]>([]);
  const [canUndo,setCanUndo]=useState(false);
  const [canRedo,setCanRedo]=useState(false);

  const sync=()=>{setCanUndo(past.current.length>0); setCanRedo(future.current.length>0);};

  const set=useCallback((updater:T|((prev:T)=>T), commit=true)=>{
    const prev=presentRef.current;
    const next=typeof updater==="function" ? (updater as (p:T)=>T)(prev) : updater;
    if(commit){ past.current=[...past.current,prev]; future.current=[]; sync(); }
    presentRef.current=next;
    setPresentState(next);
  },[]);

  const undo=useCallback(()=>{
    if(past.current.length===0) return;
    const p=past.current[past.current.length-1];
    past.current=past.current.slice(0,-1);
    future.current=[presentRef.current,...future.current];
    presentRef.current=p; setPresentState(p); sync();
  },[]);

  const redo=useCallback(()=>{
    if(future.current.length===0) return;
    const n=future.current[0];
    future.current=future.current.slice(1);
    past.current=[...past.current,presentRef.current];
    presentRef.current=n; setPresentState(n); sync();
  },[]);

  return {present,set,undo,redo,canUndo,canRedo};
}
