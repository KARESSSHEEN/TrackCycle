document.addEventListener("DOMContentLoaded", () => {

    const reservationSuccessDialog =
        document.getElementById("reservationSuccessDialog");

    const reservationSuccessOk =
        document.getElementById("reservationSuccessOk");

    if (reservationSuccessDialog && reservationSuccessOk) {
        reservationSuccessOk.addEventListener("click", () => {
            reservationSuccessDialog.close();
        });

        reservationSuccessDialog.addEventListener("click", (event) => {
            if (event.target === reservationSuccessDialog) {
                reservationSuccessDialog.close();
            }
        });

        reservationSuccessDialog.addEventListener("close", () => {
            goToTripPage();
        });
    }

    /* ================= ANNOUNCEMENTS ================= */

    const announcementContainer =
        document.querySelector(".announcement-container");

    if (
        announcementContainer &&
        typeof announcements !== "undefined"
    ) {

        announcementContainer.innerHTML = "";

        announcements.forEach((announcement) => {

            const announcementCard =
                document.createElement("div");

            announcementCard.className =
                "announcement-card";

            announcementCard.innerHTML = `
                <i class="${announcement.icon}"></i>

                <div class="announcement-text">
                    <h3>${announcement.title}</h3>
                    <p>${announcement.message}</p>
                </div>
            `;

            announcementContainer.appendChild(
                announcementCard
            );
        });
    }


    /* ================= STATIONS ================= */

    const pickupStation =
        document.getElementById("pickupStation");

    if (
        pickupStation &&
        typeof stations !== "undefined"
    ) {

        stations.forEach((station) => {

            const option =
                document.createElement("option");

            option.value = station.name;

            option.textContent =
                `${station.name} - ${station.area}`;

            pickupStation.appendChild(option);
        });
    }


    /* ================= DESTINATIONS ================= */

    const properDestinationChoices =
        document.getElementById("properDestinationChoices");
    const specialDestinationChoices =
        document.getElementById("specialDestinationChoices");

    if (
        properDestinationChoices &&
        specialDestinationChoices &&
        typeof destinations !== "undefined"
    ) {
        const destinationIcons = {
            school: "ri-graduation-cap-line",
            church: "ri-building-line",
            market: "ri-shopping-basket-line",
            park: "ri-tree-line",
            mall: "ri-shopping-bag-line",
            "area-a": "ri-map-pin-2-line",
            "area-b": "ri-map-pin-2-line",
            custom: "ri-map-2-line"
        };

        destinations.forEach((item) => {
            const destinationContainer = item.type === "proper"
                ? properDestinationChoices
                : specialDestinationChoices;
            const option = document.createElement("label");
            option.className = "destination-option";
            const radio = document.createElement("input");
            radio.type = "radio";
            radio.name = "destination";
            radio.value = item.name;

            const name = document.createElement("span");
            name.className = "destination-option-name";
            const icon = document.createElement("i");
            icon.className = destinationIcons[item.id] ||
                destinationIcons[item.name.toLowerCase()] ||
                "ri-map-pin-line";
            icon.setAttribute("aria-hidden", "true");
            const label = document.createElement("span");
            label.textContent = item.label;
            name.append(radio, icon, label);

            const price = document.createElement("span");
            price.className = "destination-option-price";
            price.textContent = Number.isInteger(item.fare) && item.fare >= 0
                ? `₱${item.fare} per passenger`
                : "Fare pending confirmation";

            option.append(name, price);
            destinationContainer.appendChild(option);
        });
    }


    /* ================= RESERVATION ================= */

    const reserveButton =
        document.getElementById("reserveButton");
    const seats =
        document.getElementById("seats");
    const farePerPassenger =
        document.getElementById("farePerPassenger");
    const totalAmount =
        document.getElementById("totalAmount");
    const availableSeatsDisplay =
        document.getElementById("availableSeats");
    const destinationOptions =
        document.getElementById("destination");
    const customDropoffFields =
        document.getElementById("customDropoffFields");
    const customDropoffLocation =
        document.getElementById("customDropoffLocation");
    const customFareAcknowledged =
        document.getElementById("customFareAcknowledged");
    const regularCount =
        document.getElementById("regularCount");
    const studentCount =
        document.getElementById("studentCount");
    const seniorCount =
        document.getElementById("seniorCount");
    const studentEligibility =
        document.getElementById("studentEligibility");
    const seniorEligibility =
        document.getElementById("seniorEligibility");
    const studentEligibilityField =
        document.getElementById("studentEligibilityField");
    const seniorEligibilityField =
        document.getElementById("seniorEligibilityField");
    const validationMessage =
        document.getElementById("reservationValidation");
    let reservationSubmitted = false;

    const formatCurrency = (amount) =>
        `₱${Number(amount).toLocaleString("en-PH")}`;

    const getSelectedDestination = () =>
        document.querySelector('input[name="destination"]:checked');

    const getSelectedDestinationItem = () => {
        const selectedDestination = getSelectedDestination();
        return typeof destinations === "undefined" || !selectedDestination
            ? null
            : destinations.find((entry) => entry.name === selectedDestination.value) || null;
    };

    const getPassengerCounts = () => {
        const values = [
            regularCount && regularCount.value,
            studentCount && studentCount.value,
            seniorCount && seniorCount.value
        ];
        const counts = values.map((value) => value === "" ? NaN : Number(value));

        return counts.every((count) =>
            Number.isInteger(count) && count >= 0 && count <= MAX_SEATS
        )
            ? { regular: counts[0], student: counts[1], seniorCitizen: counts[2] }
            : null;
    };

    const stationMatches = (queue, station) =>
        String(queue.station || "").trim().toLowerCase() ===
        String(station || "").trim().toLowerCase();

    const setValidationMessage = (message, focusTarget) => {
        if (!validationMessage) {
            return;
        }

        validationMessage.textContent = message;
        validationMessage.hidden = !message;
        if (message && focusTarget) {
            focusTarget.focus();
        }
    };

    const updateReservationSummary = () => {
        const stationValue = pickupStation ? pickupStation.value : "";
        const activeQueue = stationValue
            ? getActiveQueues().find((queue) => stationMatches(queue, stationValue) &&
                (queue.status === "waiting" || queue.status === "boarding"))
            : null;
        const available = activeQueue
            ? getAvailableSeats(activeQueue.totalSeats)
            : MAX_SEATS;
        const destination = getSelectedDestinationItem();
        const passengerCount = Number(seats && seats.value) || 0;
        const counts = getPassengerCounts();
        const categoryTotal = counts
            ? counts.regular + counts.student + counts.seniorCitizen
            : null;
        const isCustomDestination = destination && destination.type === "custom";
        const customLocation = customDropoffLocation
            ? customDropoffLocation.value.trim()
            : "";

        if (customDropoffFields) {
            customDropoffFields.hidden = !isCustomDestination;
            if (customDropoffLocation) {
                customDropoffLocation.required = Boolean(isCustomDestination);
            }
        }
        if (studentEligibilityField) {
            studentEligibilityField.hidden = !counts || counts.student === 0;
        }
        if (seniorEligibilityField) {
            seniorEligibilityField.hidden = !counts || counts.seniorCitizen === 0;
        }

        const summaryPickup = document.getElementById("summaryPickup");
        const summaryDestination = document.getElementById("summaryDestination");
        const summaryPassengerCount = document.getElementById("summaryPassengerCount");
        const summarySubtotal = document.getElementById("summarySubtotal");
        const summaryStudentDiscount = document.getElementById("summaryStudentDiscount");
        const summarySeniorDiscount = document.getElementById("summarySeniorDiscount");

        if (summaryPickup) {
            summaryPickup.textContent = stationValue || "Not selected";
        }
        if (summaryDestination) {
            summaryDestination.textContent = destination
                ? isCustomDestination && customLocation
                    ? `${destination.label} — ${customLocation}`
                    : destination.label
                : "Not selected";
        }
        if (summaryPassengerCount) {
            summaryPassengerCount.textContent = String(passengerCount);
        }
        if (availableSeatsDisplay) {
            availableSeatsDisplay.textContent = stationValue
                ? `${available} of ${MAX_SEATS}`
                : "Select a pickup station";
        }

        const fareIsValid = destination &&
            Number.isInteger(destination.fare) &&
            destination.fare >= 0;
        if (farePerPassenger) {
            farePerPassenger.textContent = isCustomDestination
                ? "Fare pending confirmation"
                : fareIsValid
                    ? `${formatCurrency(destination.fare)} per passenger`
                    : "Select a destination";
        }

        if (isCustomDestination) {
            if (summarySubtotal) {
                summarySubtotal.textContent = "Fare pending confirmation";
            }
            if (summaryStudentDiscount) {
                summaryStudentDiscount.textContent = "Fare pending confirmation";
            }
            if (summarySeniorDiscount) {
                summarySeniorDiscount.textContent = "Fare pending confirmation";
            }
            if (totalAmount) {
                totalAmount.textContent = "Fare pending confirmation";
            }
        } else if (fareIsValid && counts) {
            const subtotal = destination.fare * categoryTotal;
            const studentDiscount = counts.student * 5;
            const seniorDiscount = counts.seniorCitizen * 5;
            const finalTotal = Math.max(0, subtotal - studentDiscount - seniorDiscount);

            if (summarySubtotal) {
                summarySubtotal.textContent = formatCurrency(subtotal);
            }
            if (summaryStudentDiscount) {
                summaryStudentDiscount.textContent = formatCurrency(studentDiscount);
            }
            if (summarySeniorDiscount) {
                summarySeniorDiscount.textContent = formatCurrency(seniorDiscount);
            }
            if (totalAmount) {
                totalAmount.textContent = formatCurrency(finalTotal);
            }
        } else {
            [summarySubtotal, summaryStudentDiscount, summarySeniorDiscount, totalAmount]
                .filter(Boolean)
                .forEach((element) => {
                    element.textContent = formatCurrency(0);
                });
        }

    };

    const updateRegularPassengerCount = () => {
        const total = Number(seats && seats.value);
        const students = Number(studentCount && studentCount.value) || 0;
        const seniors = Number(seniorCount && seniorCount.value) || 0;

        if (regularCount && Number.isInteger(total) && total > 0) {
            regularCount.value = String(Math.max(0, total - students - seniors));
        }
        updateReservationSummary();
    };

    if (
        reserveButton &&
        pickupStation &&
        seats
    ) {
        pickupStation.addEventListener("change", () => {
            setValidationMessage("");
            updateReservationSummary();
        });
        seats.addEventListener("change", () => {
            setValidationMessage("");
            updateRegularPassengerCount();
        });
        if (destinationOptions) {
            destinationOptions.addEventListener("change", () => {
                setValidationMessage("");
                updateReservationSummary();
            });
        }
        [
            regularCount,
            studentCount,
            seniorCount,
            customDropoffLocation,
            customFareAcknowledged,
            studentEligibility,
            seniorEligibility
        ].filter(Boolean).forEach((control) => {
            control.addEventListener("input", () => {
                setValidationMessage("");
                updateReservationSummary();
            });
            control.addEventListener("change", () => {
                setValidationMessage("");
                updateReservationSummary();
            });
        });
        updateReservationSummary();

        reserveButton.addEventListener("click", () => {
            if (reservationSubmitted) {
                return;
            }

            if (typeof updateTimer === "function") {
                updateTimer();
            }

            const stationValue = pickupStation.value;
            const selectedDestination = getSelectedDestination();
            const destination = getSelectedDestinationItem();
            const destinationValue = selectedDestination ? selectedDestination.value : "";
            const seatsValue = seats.value;
            const activeQueues = getActiveQueues();
            const activeQueue = activeQueues.find((queue) =>
                stationMatches(queue, stationValue) &&
                (queue.status === "waiting" || queue.status === "boarding")
            );
            const availableSeats = activeQueue
                ? getAvailableSeats(activeQueue.totalSeats)
                : MAX_SEATS;
            const baseValidation = validateReservation(
                stationValue,
                destinationValue,
                seatsValue,
                availableSeats
            );

            if (!baseValidation.valid) {
                const destinationFocusTarget = destinationOptions
                    ? destinationOptions.querySelector('input[name="destination"]')
                    : null;
                setValidationMessage(
                    baseValidation.message,
                    !stationValue ? pickupStation : !destinationValue
                        ? destinationFocusTarget
                        : seats
                );
                return;
            }

            const seatCount = Number(seatsValue);
            const counts = getPassengerCounts();

            if (!counts) {
                setValidationMessage(
                    "Enter whole passenger counts from 0 to 6 for each category.",
                    regularCount
                );
                return;
            }

            if (counts.regular + counts.student + counts.seniorCitizen !== seatCount) {
                setValidationMessage(
                    "Regular, student, and senior citizen counts must add up to the total passenger count.",
                    regularCount
                );
                return;
            }

            if (counts.student > 0 && !studentEligibility.checked) {
                setValidationMessage(
                    "Confirm student eligibility to apply the student discount.",
                    studentEligibility
                );
                return;
            }

            if (counts.seniorCitizen > 0 && !seniorEligibility.checked) {
                setValidationMessage(
                    "Confirm senior citizen eligibility to apply the senior discount.",
                    seniorEligibility
                );
                return;
            }

            if (destination.type === "custom") {
                if (!customDropoffLocation.value.trim()) {
                    setValidationMessage(
                        "Enter the exact custom drop-off location.",
                        customDropoffLocation
                    );
                    return;
                }
                if (!customFareAcknowledged.checked) {
                    setValidationMessage(
                        "Acknowledge that the custom fare requires confirmation.",
                        customFareAcknowledged
                    );
                    return;
                }
                setValidationMessage(
                    "This custom fare is still pending. Confirm the fare with the operator before making this reservation.",
                    customFareAcknowledged
                );
                return;
            }

            if (!Number.isInteger(destination.fare) || destination.fare < 0) {
                setValidationMessage(
                    "The selected destination has an invalid fare. Please choose another destination.",
                    destinationOptions
                );
                return;
            }

            let queue = activeQueue;
            const isNewQueue = !queue;
            if (isNewQueue) {
                queue = createActiveQueue(stationValue);
            }

            const seatsStillAvailable = getAvailableSeats(queue.totalSeats);
            if (seatCount > seatsStillAvailable) {
                setValidationMessage(
                    `Only ${seatsStillAvailable} seat(s) are available at this station.`,
                    seats
                );
                updateReservationSummary();
                return;
            }

            const subtotal = destination.fare * seatCount;
            const studentDiscountAmount = counts.student * 5;
            const seniorCitizenDiscountAmount = counts.seniorCitizen * 5;
            const totalDiscount = studentDiscountAmount + seniorCitizenDiscountAmount;
            const finalTotal = Math.max(0, subtotal - totalDiscount);

            const seatsAdded = addSeatsToQueue(queue, seatCount);
            if (seatsAdded !== seatCount) {
                setValidationMessage(
                    "The selected number of seats is no longer available.",
                    seats
                );
                updateReservationSummary();
                return;
            }

            reservationSubmitted = true;
            reserveButton.disabled = true;

            if (isFull(queue.totalSeats)) {
                startBoardingTimer(queue);
            }
            if (isNewQueue) {
                activeQueues.push(queue);
            }
            saveActiveQueues(activeQueues);

            const now = new Date();
            const booking = {
                userId: typeof tcUser === "function" && tcUser() ? tcUser().id : null,
                id: `TC-${Date.now()}`,
                queueId: queue.id,
                station: stationValue,
                destination: destination.name,
                destinationId: destination.id,
                destinationType: destination.type,
                destinationLabel: destination.label,
                seats: seatCount,
                passengerCounts: {
                    regular: counts.regular,
                    student: counts.student,
                    seniorCitizen: counts.seniorCitizen
                },
                regularCount: counts.regular,
                studentCount: counts.student,
                seniorCitizenCount: counts.seniorCitizen,
                unitFare: destination.fare,
                subtotal,
                studentDiscountAmount,
                seniorCitizenDiscountAmount,
                totalDiscount,
                totalAmount: finalTotal,
                fareConfirmationStatus: "not_required",
                studentEligibilityConfirmed: counts.student > 0 && studentEligibility.checked,
                seniorEligibilityConfirmed: counts.seniorCitizen > 0 && seniorEligibility.checked,
                status: queue.status,
                isFull: isFull(queue.totalSeats),
                date: now.toISOString(),
                time: now.toISOString()
            };

            const bookings = getBookings();
            bookings.push(booking);
            saveBookings(bookings);
            saveCurrentBooking(booking);

            reservationSuccessDialog.showModal();
        });
    }

});