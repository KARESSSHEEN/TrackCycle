const STORAGE_KEYS = {
    bookings: "trackcycle_bookings",
    currentBooking: "trackcycle_current_booking",
    activeQueues: "trackcycle_active_queues",
    legacyActiveQueue: "trackcycle_active_queue",
    tripHistory: "trackcycle_trip_history"
};


/* ================= BOOKINGS ================= */

function getBookings() {
    const bookings = localStorage.getItem(STORAGE_KEYS.bookings);

    if (!bookings) {
        return [];
    }

    try {
        const parsedBookings = JSON.parse(bookings);
        if (Array.isArray(parsedBookings)) {
            return parsedBookings;
        }

        if (parsedBookings && typeof parsedBookings === "object") {
            for (const property of ["bookings", "bookingHistory", "reservationHistory", "records", "data", "items"]) {
                if (Array.isArray(parsedBookings[property])) {
                    return parsedBookings[property];
                }
            }

            if (
                parsedBookings.id !== undefined ||
                parsedBookings.bookingId !== undefined ||
                parsedBookings.reservationId !== undefined ||
                parsedBookings.booking_id !== undefined ||
                parsedBookings.reservation_id !== undefined
            ) {
                return [parsedBookings];
            }

            const keyedBookings = Object.values(parsedBookings);
            if (keyedBookings.length > 0 && keyedBookings.every((booking) =>
                booking && typeof booking === "object" &&
                (booking.id !== undefined || booking.bookingId !== undefined ||
                    booking.reservationId !== undefined || booking.booking_id !== undefined ||
                    booking.reservation_id !== undefined)
            )) {
                return keyedBookings;
            }
        }

        console.error("TrackCycle booking history has an unsupported localStorage structure.");
        return [];
    } catch (error) {
        console.error("TrackCycle booking history could not be parsed from localStorage.", error);
        return [];
    }
}


function saveBookings(bookings) {
    saveHistoryRecords(STORAGE_KEYS.bookings, bookings, ["bookings", "bookingHistory", "reservationHistory", "records", "data", "items"], ["id", "bookingId", "reservationId", "booking_id", "reservation_id"]);
}


/* ================= TRIP HISTORY ================= */

function getTripHistory() {
    const trips = localStorage.getItem(STORAGE_KEYS.tripHistory);

    if (!trips) {
        return [];
    }

    try {
        const parsedTrips = JSON.parse(trips);
        if (Array.isArray(parsedTrips)) {
            return parsedTrips;
        }

        if (parsedTrips && typeof parsedTrips === "object") {
            for (const property of ["trips", "tripHistory", "completedTrips", "records", "data", "items"]) {
                if (Array.isArray(parsedTrips[property])) {
                    return parsedTrips[property];
                }
            }

            if (
                parsedTrips.tripId !== undefined ||
                parsedTrips.queueId !== undefined ||
                parsedTrips.trip_id !== undefined ||
                parsedTrips.queue_id !== undefined
            ) {
                return [parsedTrips];
            }

            const keyedTrips = Object.values(parsedTrips);
            if (keyedTrips.length > 0 && keyedTrips.every((trip) =>
                trip && typeof trip === "object" &&
                (trip.tripId !== undefined || trip.queueId !== undefined ||
                    trip.trip_id !== undefined || trip.queue_id !== undefined)
            )) {
                return keyedTrips;
            }
        }

        console.error("TrackCycle trip history has an unsupported localStorage structure.");
        return [];
    } catch (error) {
        console.error("TrackCycle trip history could not be parsed from localStorage.", error);
        return [];
    }
}


function saveTripHistory(trips) {
    saveHistoryRecords(STORAGE_KEYS.tripHistory, trips, ["trips", "tripHistory", "completedTrips", "records", "data", "items"], ["tripId", "queueId", "trip_id", "queue_id"]);
}


function saveHistoryRecords(storageKey, records, wrapperNames, idFields) {
    const safeRecords = Array.isArray(records) ? records : [];
    const storedValue = localStorage.getItem(storageKey);

    if (!storedValue) {
        localStorage.setItem(storageKey, JSON.stringify(safeRecords));
        return;
    }

    try {
        const parsedValue = JSON.parse(storedValue);
        if (Array.isArray(parsedValue)) {
            localStorage.setItem(storageKey, JSON.stringify(safeRecords));
            return;
        }

        if (parsedValue && typeof parsedValue === "object") {
            const wrapperName = wrapperNames.find((name) => Array.isArray(parsedValue[name]));
            if (wrapperName) {
                parsedValue[wrapperName] = safeRecords;
                localStorage.setItem(storageKey, JSON.stringify(parsedValue));
                return;
            }

            const existingEntries = Object.entries(parsedValue);
            const isKeyedCollection = existingEntries.length > 0 &&
                existingEntries.every(([, record]) => record && typeof record === "object");
            if (isKeyedCollection) {
                const existingKeys = new Map(existingEntries.map(([key, record]) => {
                    const id = idFields.map((field) => record[field]).find((value) =>
                        value !== undefined && value !== null
                    );
                    return [id === undefined ? null : String(id), key];
                }));
                const updatedValue = {};

                safeRecords.forEach((record, index) => {
                    const id = idFields.map((field) => record[field]).find((value) =>
                        value !== undefined && value !== null
                    );
                    const recordId = id === undefined ? null : String(id);
                    const key = recordId !== null && existingKeys.has(recordId)
                        ? existingKeys.get(recordId)
                        : recordId || `record-${index}`;
                    updatedValue[key] = record;
                });

                localStorage.setItem(storageKey, JSON.stringify(updatedValue));
                return;
            }
        }

        localStorage.setItem(storageKey, JSON.stringify(safeRecords));
    } catch (error) {
        console.error(`TrackCycle history at ${storageKey} could not be preserved in its existing format.`, error);
    }
}


function addTripHistory(queue) {
    if (!queue || !queue.id) {
        return false;
    }

    const trips = getTripHistory();

    if (trips.some((trip) => {
        const tripId = trip.tripId !== undefined && trip.tripId !== null
            ? trip.tripId
            : trip.queueId !== undefined && trip.queueId !== null
                ? trip.queueId
                : trip.trip_id !== undefined && trip.trip_id !== null
                    ? trip.trip_id
                    : trip.queue_id;
        return tripId !== undefined && tripId !== null &&
            String(tripId) === String(queue.id);
    })) {
        return false;
    }

    const queueBookings = getQueueBookings(queue.id);
    const destinations = [...new Set(queueBookings
        .map((booking) => booking.destinationLabel || booking.destination)
        .filter(Boolean))];

    trips.push({
        tripId: queue.id,
        station: queue.station,
        destination: destinations.join(", ") || queue.destination || "",
        totalPassengers: getQueueBookingCount(queue.id),
        maxSeats: Number(queue.maxSeats) || 6,
        status: "completed",
        createdAt: queue.createdAt,
        departedAt: queue.completedAt || Date.now()
    });

    saveTripHistory(trips);
    return true;
}


/* ================= CURRENT BOOKING ================= */

function saveCurrentBooking(booking) {

    localStorage.setItem(
        STORAGE_KEYS.currentBooking,
        JSON.stringify(booking)
    );
}


function getCurrentBooking() {

    const booking = localStorage.getItem(
        STORAGE_KEYS.currentBooking
    );

    if (!booking) {
        return null;
    }

    try {
        return JSON.parse(booking);
    } catch (error) {
        return null;
    }
}


function clearCurrentBooking() {

    localStorage.removeItem(
        STORAGE_KEYS.currentBooking
    );
}


/* ================= ACTIVE QUEUES ================= */

function getQueueBookings(queueId, bookings = getBookings()) {
    return bookings
        .filter((booking) => booking.queueId !== undefined &&
            booking.queueId !== null &&
            String(booking.queueId) === String(queueId))
}


function getQueueBookingCount(queueId, bookings = getBookings()) {
    return getQueueBookings(queueId, bookings)
        .reduce((total, booking) => total + (Number(booking.seats) || 0), 0);
}


function getActiveQueues() {
    const storedQueues = localStorage.getItem(STORAGE_KEYS.activeQueues);
    const legacyQueue = localStorage.getItem(STORAGE_KEYS.legacyActiveQueue);
    let queues = [];
    let changed = false;

    if (storedQueues) {
        try {
            const parsedQueues = JSON.parse(storedQueues);
            if (!Array.isArray(parsedQueues)) {
                console.error("TrackCycle active queue data is not an array.");
                return [];
            }
            queues = parsedQueues;
        } catch (error) {
            console.error("TrackCycle active queue data could not be parsed.", error);
            return [];
        }
    }

    if (legacyQueue) {
        try {
            const queue = JSON.parse(legacyQueue);
            if (queue && typeof queue === "object" && queue.status !== "completed") {
                if (!queues.some((item) => item && item.id === queue.id)) {
                    queues.push(queue);
                }
                changed = true;
            }
        } catch (error) {
            console.error("TrackCycle legacy active queue data could not be parsed.", error);
            return queues;
        }
    }

    const bookings = getBookings();
    const activeGroups = new Map();

    queues.forEach((queue, index) => {
        if (!queue || (queue.status !== "waiting" && queue.status !== "boarding")) {
            return;
        }

        const stationKey = String(queue.station || "").trim().toLowerCase();
        if (!stationKey) {
            return;
        }
        if (!activeGroups.has(stationKey)) {
            activeGroups.set(stationKey, []);
        }
        activeGroups.get(stationKey).push({ queue, index });
    });

    const queueIdRemap = new Map();
    const removedIndexes = new Set();
    const migratedQueueIds = new Set();
    const legacySeatTotals = new Map();

    activeGroups.forEach((group) => {
        const canonical = group[0].queue;
        const canonicalId = String(canonical.id);
        legacySeatTotals.set(canonicalId, group.reduce((total, { queue }) => {
            return total + (Number(queue.totalSeats) || 0);
        }, 0));
        if (group.some(({ queue }) => queue.queueSchemaVersion !== 2)) {
            migratedQueueIds.add(canonicalId);
        }
        group.forEach(({ queue }) => {
            if (queue.id !== undefined && queue.id !== null) {
                queueIdRemap.set(String(queue.id), canonical.id);
            }
        });

        if (group.length > 1) {
            changed = true;
            group.slice(1).forEach(({ index }) => removedIndexes.add(index));

            const boardingQueues = group
                .map(({ queue }) => queue)
                .filter((queue) => queue.status === "boarding");
            const timerQueues = boardingQueues.length
                ? boardingQueues
                : group.map(({ queue }) => queue);
            const timerQueue = timerQueues.reduce((earliest, queue) => {
                const expiration = Number(queue.timerStartedAt) +
                    Number(queue.timerDuration) * 1000;
                const earliestExpiration = Number(earliest.timerStartedAt) +
                    Number(earliest.timerDuration) * 1000;
                return expiration < earliestExpiration ? queue : earliest;
            });

            canonical.status = boardingQueues.length ? "boarding" : "waiting";
            canonical.timerStartedAt = timerQueue.timerStartedAt;
            canonical.timerDuration = timerQueue.timerDuration;
        }
    });

    if (queueIdRemap.size > 0) {
        let bookingsChanged = false;
        bookings.forEach((booking) => {
            const queueId = queueIdRemap.get(String(booking.queueId));
            if (queueId !== undefined && booking.queueId !== queueId) {
                booking.queueId = queueId;
                bookingsChanged = true;
            }
        });
        if (bookingsChanged) {
            saveBookings(bookings);
            changed = true;
        }

        const currentBooking = getCurrentBooking();
        if (currentBooking) {
            const queueId = queueIdRemap.get(String(currentBooking.queueId));
            if (queueId !== undefined && currentBooking.queueId !== queueId) {
                currentBooking.queueId = queueId;
                saveCurrentBooking(currentBooking);
                changed = true;
            }
        }
    }

    queues = queues.filter((queue, index) => !removedIndexes.has(index));

    queues.forEach((queue) => {
        if (!queue || (queue.status !== "waiting" && queue.status !== "boarding")) {
            return;
        }
        const passengerCount = getQueueBookingCount(queue.id, bookings);
        const legacySeatCount = legacySeatTotals.get(String(queue.id));
        if (
            migratedQueueIds.has(String(queue.id)) &&
            legacySeatCount !== undefined &&
            legacySeatCount !== passengerCount
        ) {
            console.error(
                `TrackCycle migrated queue ${queue.id} with ${passengerCount} passengers linked to bookings, but its legacy queue records reported ${legacySeatCount}. Booking and trip history were preserved.`
            );
        }
        if (Number(queue.totalSeats) !== passengerCount) {
            queue.totalSeats = passengerCount;
            changed = true;
        }
        if (queue.queueSchemaVersion !== 2) {
            queue.queueSchemaVersion = 2;
            changed = true;
        }
        if (passengerCount > (Number(queue.maxSeats) || 6) && !queue.capacityMigrationWarning) {
            console.error(
                `TrackCycle migrated queue ${queue.id} with ${passengerCount} existing passengers; its legacy bookings exceed capacity. No bookings were deleted.`
            );
            queue.capacityMigrationWarning = true;
            changed = true;
        }
    });

    if (changed) {
        saveActiveQueues(queues);
    }

    return queues;
}


function saveActiveQueues(queues) {
    localStorage.setItem(
        STORAGE_KEYS.activeQueues,
        JSON.stringify(Array.isArray(queues) ? queues : [])
    );

    localStorage.removeItem(STORAGE_KEYS.legacyActiveQueue);
}


function getActiveQueue(queueId) {
    const queues = getActiveQueues();

    if (queueId !== undefined && queueId !== null) {
        return queues.find((queue) => queue.id === queueId) || null;
    }

    return queues[0] || null;
}


function saveActiveQueue(queue) {
    if (!queue || !queue.id) {
        return;
    }

    const queues = getActiveQueues();
    const existingIndex = queues.findIndex((item) => item.id === queue.id);

    if (queue.status === "completed") {
        if (existingIndex !== -1) {
            queues.splice(existingIndex, 1);
        }
    } else if (existingIndex === -1) {
        queues.push(queue);
    } else {
        queues[existingIndex] = queue;
    }

    saveActiveQueues(queues);
}


function clearActiveQueue(queueId) {
    if (queueId === undefined || queueId === null) {
        saveActiveQueues([]);
        return;
    }

    saveActiveQueues(
        getActiveQueues().filter((queue) => queue.id !== queueId)
    );
}