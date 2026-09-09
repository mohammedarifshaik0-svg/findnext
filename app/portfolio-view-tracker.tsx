"use client";
import {useEffect} from "react";
export function PortfolioViewTracker({slug}:{slug:string}){useEffect(()=>{const key=`vxl-view:${slug}:${new Date().toISOString().slice(0,10)}`;if(sessionStorage.getItem(key))return;sessionStorage.setItem(key,"1");void fetch("/api/analytics",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({slug}),keepalive:true});},[slug]);return null;}
