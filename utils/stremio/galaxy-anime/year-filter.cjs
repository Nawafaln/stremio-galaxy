// Stremio Galaxy community modification, GPL-3.0. Release year means first airing/release date.
'use strict';
function years(){return Array.from({length:new Date().getFullYear()+2-1900+1},(_,i)=>String(new Date().getFullYear()+2-i))}
function parseYear(value){if(value===null||value===undefined||value==='')return '';return typeof value==='string'&&years().includes(value)?value:null}
function matchesYear(meta,year){return !year||/^\d{4}(?:\D|$)/.test(String(meta.releaseInfo||''))&&String(meta.releaseInfo).slice(0,4)===year}
module.exports={years,parseYear,matchesYear};
