// ============================================================
// PALAZZO ETERNO
// BASE SERVICES - API
//
// Ponte fra il Livello Base e le RPC Supabase.
// Non contiene logica grafica.
// ============================================================

(() => {
    "use strict";

    const CHANNEL_NAME = "palazzo-eterno-base-services";
    let realtimeChannel = null;

    function getDb() {
        if (typeof db !== "undefined" && db) {
            return db;
        }

        if (
            typeof supabaseClient !== "undefined" &&
            supabaseClient
        ) {
            return supabaseClient;
        }

        throw new Error(
            "Client Supabase non disponibile per i servizi della Base."
        );
    }

    async function getServiceState(serviceKey) {
        const client = getDb();

        const { data, error } = await client.rpc(
            "get_base_service_state",
            {
                p_service_key: serviceKey
            }
        );

        if (error) {
            throw error;
        }

        return data;
    }

    async function contribute(
        serviceKey,
        itemId,
        quantity
    ) {
        const parsedQuantity = Math.floor(
            Number(quantity)
        );

        if (
            !Number.isFinite(parsedQuantity) ||
            parsedQuantity <= 0
        ) {
            throw new Error(
                "Inserisci una quantità valida."
            );
        }

        const client = getDb();

        const { data, error } = await client.rpc(
            "contribute_to_base_service",
            {
                p_service_key: serviceKey,
                p_item_id: itemId,
                p_quantity: parsedQuantity
            }
        );

        if (error) {
            throw error;
        }

        return data;
    }

    async function subscribe(onChange) {
        unsubscribe();

        const client = getDb();

        realtimeChannel = client
            .channel(CHANNEL_NAME)
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "base_services"
                },
                payload => {
                    if (
                        typeof onChange ===
                        "function"
                    ) {
                        onChange({
                            table: "base_services",
                            payload
                        });
                    }
                }
            )
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "base_service_requirements"
                },
                payload => {
                    if (
                        typeof onChange ===
                        "function"
                    ) {
                        onChange({
                            table: "base_service_requirements",
                            payload
                        });
                    }
                }
            )
            .subscribe(status => {
                console.log(
                    "[BASE SERVICES] Realtime:",
                    status
                );
            });

        return realtimeChannel;
    }

    function unsubscribe() {
        if (!realtimeChannel) {
            return;
        }

        try {
            const client = getDb();

            client.removeChannel(
                realtimeChannel
            );
        } catch (error) {
            console.warn(
                "[BASE SERVICES] Errore chiusura Realtime:",
                error
            );
        }

        realtimeChannel = null;
    }

    window.BaseServicesApi = {
        getServiceState,
        contribute,
        subscribe,
        unsubscribe
    };
})();