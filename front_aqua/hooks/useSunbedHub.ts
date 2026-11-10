import { useEffect } from "react";
import * as signalR from "@microsoft/signalr";
import { Sunbed } from "@/types/sunbeds";

const HUB_URL = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/hubs/sunbed`
  : "http://localhost:5000/hubs/sunbed";

export function useSunbedHub(
  visitDate: string,
  holdTokenRef: React.MutableRefObject<string>,
  setSunbeds: React.Dispatch<React.SetStateAction<Sunbed[]>>
) {
  useEffect(() => {
    if (!visitDate) return;
    let isCancelled = false;

    // Налаштування підключення
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(HUB_URL, { withCredentials: true })
      .withAutomaticReconnect([0, 2000, 5000, 10000])
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    // Обробка події від бекенду
    connection.on("SunbedStatusUpdated", (data) => {
      setSunbeds((prev) =>
        prev.map((s) => {
          if (s.id.toLowerCase() === data.sunbedId.toLowerCase()) {
            const isMyHold = Boolean(
              holdTokenRef.current && data.heldByToken === holdTokenRef.current
            );
            return { ...s, isAvailable: data.isAvailable || isMyHold };
          }
          return s;
        })
      );
    });

    const startConnection = async () => {
      try {
        await connection.start();
        if (!isCancelled) {
          await connection.invoke("JoinDateGroup", visitDate);
        }
      } catch (err) {
        if (!isCancelled) console.error("Помилка SignalR:", err);
      }
    };

    startConnection();

    // Очищення при зміні дати або демонтажі компонента
    return () => {
      isCancelled = true;
      if (connection.state === signalR.HubConnectionState.Connected) {
        connection.invoke("LeaveDateGroup", visitDate).catch(() => {});
        connection.stop();
      }
    };
  }, [visitDate, setSunbeds, holdTokenRef]);
}