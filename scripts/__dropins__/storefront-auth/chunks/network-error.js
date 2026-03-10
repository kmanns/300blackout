/*! Copyright 2026 Adobe
All Rights Reserved. */
import{setEndpoint as h,setFetchGraphQlHeader as n,removeFetchGraphQlHeader as c,setFetchGraphQlHeaders as p,fetchGraphQl as i,getConfig as f}from"@dropins/tools/fetch-graphql.js";import{events as r}from"@dropins/tools/event-bus.js";const m=t=>{throw t instanceof DOMException&&t.name==="AbortError"||r.emit("auth/error",{source:"auth",type:"network",error:t}),t};export{n as a,p as b,i as f,f as g,m as h,c as r,h as s};
//# sourceMappingURL=network-error.js.map
