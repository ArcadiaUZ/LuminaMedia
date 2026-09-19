"use client";
import { useEffect, useLayoutEffect } from "react";

// Paint'dan oldin ishlaydigan effect — SSR'da server bilan bir xil HTML
// chiziladi (hydration safe), client'da esa chizishdan oldin kesh tiklanib
// layout siljishi bo'lmaydi.
export const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;
