document.addEventListener("DOMContentLoaded", () => {
    const historyContent = document.getElementById("historyContent");
    const tripHistoryContent = document.getElementById("tripHistoryContent");
    const deleteDialog = document.getElementById("historyDeleteDialog");

    if (!historyContent || !tripHistoryContent || !deleteDialog) {
        return;
    }

    const deleteTitle = document.getElementById("historyDeleteTitle");
    const deleteMessage = document.getElementById("historyDeleteMessage");
    const deleteConfirm = document.getElementById("historyDeleteConfirm");
    const pendingDeletion = { type: null, id: null };

    const escapeHTML = (value) => String(value).replace(/[&<>"']/g, (character) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "\"": "&quot;",
        "'": "&#39;"
    })[character]);

    const formatBookingDate = (value) => {
        const date = value ? new Date(value) : null;

        if (!date || Number.isNaN(date.getTime())) {
            return {
                date: "Unknown date",
                time: "--:--"
            };
        }

        return {
            date: date.toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric"
            }),
            time: date.toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit"
            })
        };
    };

    const formatMoney = (value) => {
        if (value === undefined || value === null || !Number.isFinite(Number(value))) {
            return "Not recorded";
        }
        return `₱${Number(value).toLocaleString("en-PH")}`;
    };

    const renderBookingHistory = () => {
        const account = typeof tcUser === "function" ? tcUser() : null;
        const bookings = account ? getBookings().filter(booking => booking.userId === account.id) : getBookings();

        if (!Array.isArray(bookings) || bookings.length === 0) {
            historyContent.innerHTML = `
                <div class="history-card empty-history">
                    <i class="ri-file-list-3-line"></i>
                    <h2>No history yet</h2>
                    <p>
                        Your completed reservations will appear here once you finish a trip.
                    </p>
                    <a href="reserve.html" class="reserve-btn">
                        <i class="ri-add-line"></i>
                        Reserve Your First Ride
                    </a>
                </div>
            `;

            return;
        }

        const sortedBookings = [...bookings].sort((a, b) => {
            return new Date(b.date || 0) - new Date(a.date || 0);
        });

        const cards = sortedBookings.map((booking) => {
            const formatted = formatBookingDate(
                booking.date || booking.dateTime || booking.bookedAt || booking.timestamp ||
                booking.booking_date || booking.created_at
            );
            const status = booking.status || booking.bookingStatus || booking.booking_status || "Waiting";
            const statusKey = String(status).toLowerCase();
            const rawBookingId = booking.id !== undefined && booking.id !== null
                ? booking.id
                : booking.bookingId !== undefined && booking.bookingId !== null
                    ? booking.bookingId
                    : booking.reservationId !== undefined && booking.reservationId !== null
                        ? booking.reservationId
                        : booking.booking_id !== undefined && booking.booking_id !== null
                            ? booking.booking_id
                            : booking.reservation_id;
            const bookingId = rawBookingId === undefined || rawBookingId === null
                ? ""
                : String(rawBookingId);
            const station = booking.station || booking.pickupStation || booking.pickup_station || booking.pickup || "N/A";
            const destination = booking.destinationLabel || booking.destination ||
                booking.destinationName || booking.destination_name || "N/A";
            const seats = booking.seats !== undefined ? booking.seats
                : booking.passengerCount !== undefined ? booking.passengerCount
                    : booking.passenger_count !== undefined ? booking.passenger_count
                        : booking.passengers || 0;
            const unitFare = booking.unitFare !== undefined ? booking.unitFare
                : booking.farePerPassenger !== undefined ? booking.farePerPassenger
                    : booking.fare_per_passenger !== undefined ? booking.fare_per_passenger
                        : booking.fare;
            const totalAmount = booking.totalAmount !== undefined ? booking.totalAmount
                : booking.totalFare !== undefined ? booking.totalFare
                    : booking.total_amount !== undefined ? booking.total_amount
                        : booking.amount;
            const passengerCounts = booking.passengerCounts || {};
            const categorySummary = [
                `Regular ${passengerCounts.regular ?? booking.regularCount ?? "Not recorded"}`,
                `Student ${passengerCounts.student ?? booking.studentCount ?? "Not recorded"}`,
                `Senior ${passengerCounts.seniorCitizen ?? booking.seniorCitizenCount ?? "Not recorded"}`
            ].join(" · ");

            let statusClass = "status-waiting";

            if (statusKey === "completed") {
                statusClass = "status-completed";
            } else if (statusKey === "boarding") {
                statusClass = "status-boarding";
            } else if (statusKey === "cancelled") {
                statusClass = "status-cancelled";
            }

            return `
                <article class="history-item">
                    <div class="history-item-header">
                        <div class="history-record-title">
                            <span class="history-record-icon" aria-hidden="true">
                                <i class="ri-receipt-line"></i>
                            </span>
                            <div>
                                <span class="history-label">Booking ID</span>
                                <h3>${escapeHTML(bookingId || "N/A")}</h3>
                            </div>
                        </div>
                        <span class="status-badge ${statusClass}">${escapeHTML(status)}</span>
                    </div>

                    <div class="history-details">
                        <div class="history-detail">
                            <span class="history-label">Pickup</span>
                            <p>${escapeHTML(station)}</p>
                        </div>
                        <div class="history-detail">
                            <span class="history-label">Destination</span>
                            <p>${escapeHTML(destination)}</p>
                        </div>
                        <div class="history-detail">
                            <span class="history-label">Seats</span>
                            <p>${escapeHTML(seats)}</p>
                        </div>
                        <div class="history-detail">
                            <span class="history-label">Passenger categories</span>
                            <p>${escapeHTML(categorySummary)}</p>
                        </div>
                        <div class="history-detail">
                            <span class="history-label">Fare per passenger</span>
                            <p>${escapeHTML(formatMoney(unitFare))}</p>
                        </div>
                        <div class="history-detail">
                            <span class="history-label">Subtotal</span>
                            <p>${escapeHTML(formatMoney(booking.subtotal))}</p>
                        </div>
                        <div class="history-detail">
                            <span class="history-label">Student discount</span>
                            <p>${escapeHTML(formatMoney(booking.studentDiscountAmount))}</p>
                        </div>
                        <div class="history-detail">
                            <span class="history-label">Senior citizen discount</span>
                            <p>${escapeHTML(formatMoney(booking.seniorCitizenDiscountAmount))}</p>
                        </div>
                        <div class="history-detail">
                            <span class="history-label">Total discount</span>
                            <p>${escapeHTML(formatMoney(booking.totalDiscount))}</p>
                        </div>
                        <div class="history-detail">
                            <span class="history-label">Total amount</span>
                            <p>${escapeHTML(formatMoney(totalAmount))}</p>
                        </div>
                        <div class="history-detail">
                            <span class="history-label">Date</span>
                            <p>${formatted.date}</p>
                        </div>
                        <div class="history-detail">
                            <span class="history-label">Time</span>
                            <p>${escapeHTML(booking.time || booking.booking_time || formatted.time)}</p>
                        </div>
                    </div>

                    ${account && booking.userId === account.id ? `
                    <div class="history-item-actions">
                        ${booking.status === "waiting" && booking.queueId && booking.destinationId != null ? `<button class="history-edit" type="button" data-edit-booking-id="${escapeHTML(bookingId)}"><i class="ri-edit-2-line" aria-hidden="true"></i> Edit</button>` : ""}
                        <button class="history-delete" type="button"
                            data-booking-id="${escapeHTML(bookingId)}" ${bookingId ? "" : "disabled"}>
                            <i class="ri-delete-bin-line" aria-hidden="true"></i> Delete
                        </button>
                    </div>` : ""}
                </article>
            `;
        }).join("");

        historyContent.innerHTML = `
            <div class="history-list">
                ${cards}
            </div>
        `;
    };

    const renderTripHistory = () => {
        const trips = getTripHistory();

        if (!Array.isArray(trips) || trips.length === 0) {
            tripHistoryContent.innerHTML = `
                <div class="history-card empty-history">
                    <i class="ri-route-line"></i>
                    <h2>No trip history yet.</h2>
                    <p>Completed tricycle trips will appear here after departure.</p>
                </div>
            `;

            return;
        }

        const sortedTrips = [...trips].sort((a, b) => {
            return new Date(b.departedAt || b.completedAt || b.departed_at || b.date || 0) -
                new Date(a.departedAt || a.completedAt || a.departed_at || a.date || 0);
        });

        const cards = sortedTrips.map((trip) => {
            const departedAt = trip.departedAt || trip.completedAt || trip.departed_at || trip.date || trip.time;
            const departed = formatBookingDate(departedAt);
            const rawTripId = trip.tripId !== undefined && trip.tripId !== null
                ? trip.tripId
                : trip.queueId !== undefined && trip.queueId !== null
                    ? trip.queueId
                    : trip.trip_id !== undefined && trip.trip_id !== null
                        ? trip.trip_id
                        : trip.queue_id;
            const tripId = rawTripId === undefined || rawTripId === null
                ? ""
                : String(rawTripId);
            const station = trip.station || trip.pickupStation || trip.pickup_station || trip.pickup || "N/A";
            const destination = trip.destination || trip.destinationName || trip.destination_name || "N/A";
            const passengers = trip.totalPassengers !== undefined ? trip.totalPassengers
                : trip.passengerCount !== undefined ? trip.passengerCount
                    : trip.passenger_count !== undefined ? trip.passenger_count
                        : trip.seats || 0;
            const maxPassengers = trip.maxSeats !== undefined ? trip.maxSeats : 6;

            return `
                <article class="history-item trip-history-item">
                    <div class="history-item-header">
                        <div class="history-record-title">
                            <span class="history-record-icon" aria-hidden="true">
                                <i class="ri-route-line"></i>
                            </span>
                            <div>
                                <span class="history-label">Completed trip</span>
                                <h3>Trip #${escapeHTML(tripId || "N/A")}</h3>
                            </div>
                        </div>
                        <span class="status-badge status-completed">${escapeHTML(trip.status || "Completed")}</span>
                    </div>

                    <div class="trip-history-route">
                        <i class="ri-map-pin-route-line" aria-hidden="true"></i>
                        <p>
                            ${escapeHTML(station)}
                            <span aria-hidden="true">→</span>
                            ${escapeHTML(destination)}
                        </p>
                    </div>

                    <div class="history-details trip-history-details">
                        <div class="history-detail">
                            <span class="history-label">Passengers</span>
                            <p>${Number(passengers) || 0} / ${Number(maxPassengers) || 6}</p>
                        </div>
                        <div class="history-detail trip-departed-detail">
                            <span class="history-label">Departed</span>
                            <p>${escapeHTML(departed.date)} · ${escapeHTML(trip.time || trip.departed_time || departed.time)}</p>
                        </div>
                    </div>

                </article>
            `;
        }).join("");

        tripHistoryContent.innerHTML = `
            <div class="history-list">
                ${cards}
            </div>
        `;
    };

    const historyTabs = document.querySelectorAll("[data-history-tab]");

    const openDeleteDialog = (type, id) => {
        if (type !== "booking" || !tcUser() || !id || deleteDialog.open) {
            return;
        }

        pendingDeletion.type = type;
        pendingDeletion.id = id;
        deleteTitle.textContent = type === "booking" ? "Delete Booking?" : "Delete Trip?";
        deleteMessage.textContent = `Are you sure you want to delete this ${type}?`;
        deleteDialog.showModal();
        deleteConfirm.focus();
    };

    const finishDelete = () => {
        if (!pendingDeletion.type || !pendingDeletion.id) {
            return;
        }

        const { type, id } = pendingDeletion;
        pendingDeletion.type = null;
        pendingDeletion.id = null;
        deleteDialog.close();

        if (type === "booking") {
            const account = tcUser();
            if (!account) return;
            const bookings = getBookings();
            const bookingIndex = bookings.findIndex((booking) => {
                const bookingId = booking.id !== undefined && booking.id !== null
                    ? booking.id
                    : booking.bookingId !== undefined && booking.bookingId !== null
                        ? booking.bookingId
                        : booking.reservationId !== undefined && booking.reservationId !== null
                            ? booking.reservationId
                            : booking.booking_id !== undefined && booking.booking_id !== null
                                ? booking.booking_id
                                : booking.reservation_id;
                return bookingId !== undefined && bookingId !== null &&
                    String(bookingId) === id;
            });

            if (bookingIndex !== -1 && bookings[bookingIndex].userId === account.id) {
                bookings.splice(bookingIndex, 1);
                saveBookings(bookings);
                renderBookingHistory();
            }
            return;
        }

    };

    historyTabs.forEach((tab) => {
        tab.addEventListener("click", () => {
            const showingTrips = tab.dataset.historyTab === "trips";

            historyTabs.forEach((historyTab) => {
                const selected = historyTab === tab;
                historyTab.classList.toggle("active", selected);
                historyTab.setAttribute("aria-selected", String(selected));
            });

            document.getElementById("bookingHistoryPanel").hidden = showingTrips;
            document.getElementById("tripHistoryPanel").hidden = !showingTrips;
            renderBookingHistory();
            renderTripHistory();
        });
    });

    const editDialog=document.getElementById('editReservationDialog');
    const editForm=document.getElementById('editReservationForm');
    const editMessage=document.getElementById('editReservationMessage');
    const editFare=document.getElementById('editReservationFare');
    let editingId=null;
    const eligibleDestinations=typeof destinations!=='undefined'?destinations.filter(d=>d.type!=='custom'&&Number.isInteger(d.fare)):[];
    editForm.elements.destination.innerHTML=eligibleDestinations.map(d=>`<option value="${escapeHTML(d.id)}">${escapeHTML(d.name)} — ₱${d.fare}</option>`).join('');
    const editEstimate=()=>{const d=eligibleDestinations.find(d=>String(d.id)===editForm.elements.destination.value);const seats=Number(editForm.elements.seats.value),student=Number(editForm.elements.student.value),senior=Number(editForm.elements.senior.value);editFare.textContent=d&&Number.isInteger(seats)?`Estimated total: ₱${Math.max(0,d.fare*seats-5*(student+senior))}`:''};
    editForm.addEventListener('input',editEstimate);
    historyContent.addEventListener('click',event=>{
      const btn=event.target.closest('[data-edit-booking-id]');if(!btn)return;
      const account=typeof tcUser==='function'?tcUser():null;if(!account)return;
      if(typeof updateTimer==='function')updateTimer();
      const b=getBookings().find(b=>String(b.id)===btn.dataset.editBookingId&&b.userId===account.id);
      const q=b&&getActiveQueues().find(q=>q.id===b.queueId);
      if(!b||!q||q.status!=='waiting'||b.status!=='waiting'||!eligibleDestinations.some(d=>String(d.id)===String(b.destinationId))){renderBookingHistory();return}
      editingId=b.id;editMessage.textContent='';editForm.elements.destination.value=String(b.destinationId);editForm.elements.seats.value=b.seats;editForm.elements.regular.value=b.passengerCounts?.regular??b.regularCount??0;editForm.elements.student.value=b.passengerCounts?.student??b.studentCount??0;editForm.elements.senior.value=b.passengerCounts?.seniorCitizen??b.seniorCitizenCount??0;editForm.elements.studentConfirmed.checked=!!b.studentEligibilityConfirmed;editForm.elements.seniorConfirmed.checked=!!b.seniorEligibilityConfirmed;editEstimate();editDialog.showModal();
    });
    document.getElementById('editReservationCancel').addEventListener('click',()=>editDialog.close());
    editDialog.addEventListener('close',()=>{editingId=null});
    editForm.addEventListener('submit',event=>{
      event.preventDefault();const account=typeof tcUser==='function'?tcUser():null;if(!account||!editingId){editMessage.textContent='Please sign in again.';return}
      if(typeof updateTimer==='function')updateTimer();
      const bookings=getBookings(),b=bookings.find(b=>String(b.id)===String(editingId)&&b.userId===account.id),queues=getActiveQueues(),q=b&&queues.find(q=>q.id===b.queueId);
      if(!b||!q||q.status!=='waiting'||b.status!=='waiting'){editMessage.textContent='This queue is no longer waiting. Changes are unavailable.';return}
      const d=eligibleDestinations.find(d=>String(d.id)===editForm.elements.destination.value);
      const nums=['seats','regular','student','senior'].map(k=>Number(editForm.elements[k].value));const [seats,regular,student,senior]=nums;
      if(!d||nums.some(n=>!Number.isInteger(n)||n<0||n>6)||seats<1||regular+student+senior!==seats){editMessage.textContent='Enter 1–6 passengers and make sure category counts add up to the total.';return}
      if(student&&!editForm.elements.studentConfirmed.checked||senior&&!editForm.elements.seniorConfirmed.checked){editMessage.textContent='Please confirm eligibility for each selected discount.';return}
      const nextTotal=Number(q.totalSeats)-Number(b.seats)+seats;
      if(nextTotal<0||nextTotal>6){editMessage.textContent=`Only ${Math.max(0,6-(Number(q.totalSeats)-Number(b.seats)))} seats are available for this reservation.`;return}
      q.totalSeats=nextTotal;
      Object.assign(b,{destination:d.name,destinationId:d.id,destinationType:d.type,destinationLabel:d.label,seats,passengerCounts:{regular,student,seniorCitizen:senior},regularCount:regular,studentCount:student,seniorCitizenCount:senior,unitFare:d.fare,subtotal:d.fare*seats,studentDiscountAmount:student*5,seniorCitizenDiscountAmount:senior*5,totalDiscount:(student+senior)*5,totalAmount:Math.max(0,d.fare*seats-(student+senior)*5),studentEligibilityConfirmed:student>0,seniorEligibilityConfirmed:senior>0,editedAt:new Date().toISOString(),isFull:nextTotal===6});
      // Commit only after all validation; queue ID and timer are preserved.
      if(nextTotal===6&&typeof startBoardingTimer==='function'){startBoardingTimer(q);b.status='boarding'}
      saveActiveQueues(queues);saveBookings(bookings);
      const current=getCurrentBooking();if(current&&String(current.id)===String(b.id))saveCurrentBooking(b);
      editDialog.close();renderBookingHistory();
    });

    historyContent.addEventListener("click", (event) => {
        const deleteButton = event.target.closest(".history-delete");

        if (!deleteButton || !historyContent.contains(deleteButton) || deleteButton.disabled) {
            return;
        }

        openDeleteDialog("booking", deleteButton.dataset.bookingId);
    });

    document.getElementById("historyDeleteCancel").addEventListener("click", () => {
        deleteDialog.close();
    });
    document.getElementById("historyDeleteClose").addEventListener("click", () => {
        deleteDialog.close();
    });
    deleteDialog.addEventListener("click", (event) => {
        if (event.target === deleteDialog) {
            deleteDialog.close();
        }
    });
    deleteDialog.addEventListener("cancel", () => {
        pendingDeletion.type = null;
        pendingDeletion.id = null;
    });
    deleteDialog.addEventListener("close", () => {
        pendingDeletion.type = null;
        pendingDeletion.id = null;
    });
    deleteConfirm.addEventListener("click", finishDelete);

    document.addEventListener("tripHistoryUpdated", renderTripHistory);

    renderBookingHistory();
    renderTripHistory();
});
