
const $ = id => document.getElementById(id);

const API_URL =
  "https://studio-s-media-api.akhilkhalilsyed1.workers.dev";

let token = "";

$("load").onclick = loadOrders;

$("password").addEventListener("keydown", event => {
  if (event.key === "Enter") loadOrders();
});

async function api(path, options = {}) {
  return fetch(API_URL + path, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: "Bearer " + token
    }
  });
}

const statusLabels = {
  New: "नवीन ऑर्डर — तपासणी बाकी",
  Approved: "प्रिंटसाठी मंजूर",
  Printed: "प्रिंट पूर्ण",
  Cancelled: "ऑर्डर रद्द",
  "Upload Failed": "फाइल अपलोड अयशस्वी"
};

function createButton(label, className = "") {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;

  if (className) button.className = className;

  return button;
}

async function downloadFile(order, file, button) {
  button.disabled = true;
  button.textContent = "डाउनलोड होत आहे...";

  try {
    const response = await api(
      `/api/admin/file/${encodeURIComponent(order.orderNumber)}/${encodeURIComponent(file.stored_name)}`
    );

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || "डाउनलोड अयशस्वी.");
    }

    const blob = await response.blob();
    const objectURL = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = objectURL;
    link.download = file.original_name || "document";
    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(objectURL), 1500);

    button.textContent = "डाउनलोड पूर्ण";

  } catch (error) {
    alert(error.message);
    button.textContent = "पुन्हा डाउनलोड करा";
  } finally {
    button.disabled = false;
  }
}

async function printFile(order, file, button, statusText) {
  const confirmed = confirm(
    "ही ऑर्डर प्रिंटसाठी मंजूर आहे.\n\n" +
    "फाइल: " + file.original_name + "\n" +
    "प्रती: " + order.copies + "\n\n" +
    "Canon G1010 प्रिंटरकडे प्रिंट विनंती पाठवायची आहे का?"
  );

  if (!confirmed) return;

  button.disabled = true;
  button.textContent = "प्रिंट विनंती पाठवत आहे...";
  statusText.textContent = "";

  try {
    const response = await api(
      `/api/admin/print/${encodeURIComponent(order.orderNumber)}/${encodeURIComponent(file.stored_name)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({})
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error || "प्रिंट विनंती अयशस्वी झाली."
      );
    }

    statusText.textContent =
      "प्रिंट विनंती PC कडे पाठवली आहे. " +
      "प्रिंटरमधून प्रत्यक्ष प्रिंट आली आहे का ते तपासा.";

    button.textContent = "विनंती पाठवली";
    button.disabled = true;

  } catch (error) {
    statusText.textContent = "त्रुटी: " + error.message;
    button.textContent = "प्रिंट पुन्हा तपासा";
    button.disabled = false;

    alert(
      error.message +
      "\n\nप्रिंट पुन्हा पाठवण्यापूर्वी प्रिंटर आणि PrintJobs लॉग तपासा."
    );
  }
}

async function updateOrderStatus(order, select, button) {
  button.disabled = true;
  button.textContent = "जतन होत आहे...";

  try {
    const response = await api(
      `/api/admin/orders/${order.id}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          status: select.value
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "स्थिती जतन झाली नाही.");
    }

    $("adminMsg").textContent =
      "ऑर्डरची स्थिती यशस्वीपणे जतन झाली.";

    await loadOrders();

  } catch (error) {
    $("adminMsg").textContent = error.message;
  } finally {
    button.disabled = false;
    button.textContent = "स्थिती जतन करा";
  }
}

function createOrderCard(order) {
  const card = document.createElement("article");
  card.className = "admin-panel";
  card.style.marginTop = "16px";

  const title = document.createElement("h3");
  title.textContent =
    `${order.orderNumber} — ${order.name} (${order.phone})`;
  card.append(title);

  const info = document.createElement("p");
  info.textContent =
    `दिनांक: ${order.createdAt || "-"} | ` +
    `प्रिंट: ${order.printType} | ` +
    `प्रती: ${order.copies} | ` +
    `पेमेंट: ${order.payment || "-"} | ` +
    `स्थिती: ${statusLabels[order.status] || order.status}`;

  card.append(info);

  const address = document.createElement("p");
  address.textContent = "पत्ता: " + (order.address || "-");
  card.append(address);

  if (order.notes) {
    const notes = document.createElement("p");
    notes.textContent = "विशेष सूचना: " + order.notes;
    card.append(notes);
  }

  const fileHeading = document.createElement("h4");
  fileHeading.textContent = "अपलोड केलेल्या फाइल्स:";
  card.append(fileHeading);

  const files = document.createElement("ul");
  files.style.padding = "0";

  (order.files || []).forEach(file => {
    const li = document.createElement("li");
    li.className = "file-item";

    const fileName = document.createElement("p");
    fileName.textContent =
      file.original_name + " (" +
      Math.ceil((file.size_bytes || 0) / 1024) + " KB)";
    li.append(fileName);

    // Download button
    const downloadButton = createButton(
      "डाउनलोड: " + file.original_name,
      "download-btn"
    );

    downloadButton.onclick = () =>
      downloadFile(order, file, downloadButton);

    li.append(downloadButton);

    // Print button: Approved PDF only
    const isPDF =
      /\.pdf$/i.test(file.stored_name || "") ||
      /\.pdf$/i.test(file.original_name || "");

    if (order.status === "Approved" && isPDF) {
      const printButton = createButton(
        "प्रिंट करा",
        "print-btn"
      );

      const printStatus = document.createElement("p");
      printStatus.className = "file-status status-msg";
      printStatus.setAttribute("aria-live", "polite");

      printButton.onclick = () =>
        printFile(order, file, printButton, printStatus);

      li.append(printButton);
      li.append(printStatus);

    } else if (order.status !== "Approved" && isPDF) {
      const note = document.createElement("p");
      note.textContent =
        "प्रिंट बटण मिळवण्यासाठी ऑर्डर मंजूर करा.";
      li.append(note);
    }

    files.append(li);
  });

  if (!order.files || order.files.length === 0) {
    const empty = document.createElement("li");
    empty.textContent = "या ऑर्डरमध्ये फाइल उपलब्ध नाही.";
    files.append(empty);
  }

  card.append(files);

  // Status controls
  const statusHeading = document.createElement("h4");
  statusHeading.textContent = "ऑर्डरची स्थिती:";
  card.append(statusHeading);

  const select = document.createElement("select");

  [
    ["New", "नवीन ऑर्डर — तपासणी बाकी"],
    ["Approved", "प्रिंटसाठी मंजूर"],
    ["Printed", "प्रिंट पूर्ण"],
    ["Cancelled", "ऑर्डर रद्द"]
  ].forEach(([value, label]) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    select.append(option);
  });

  select.value = [
    "New",
    "Approved",
    "Printed",
    "Cancelled"
  ].includes(order.status) ? order.status : "New";

  card.append(select);

  const saveButton = createButton("स्थिती जतन करा");

  saveButton.onclick = () =>
    updateOrderStatus(order, select, saveButton);

  card.append(saveButton);

  return card;
}

async function loadOrders() {
  token = $("password").value.trim();

  if (!token) {
    $("adminMsg").textContent =
      "कृपया Admin Password टाका.";
    return;
  }

  $("load").disabled = true;
  $("adminMsg").textContent = "ऑर्डर लोड होत आहेत...";
  $("orders").innerHTML = "";

  try {
    const response = await api("/api/admin/orders");
    const data = await response.json();

    if (!response.ok) {
      $("adminMsg").textContent =
        data.error || "प्रवेश नाकारला.";
      return;
    }

    $("adminMsg").textContent =
      "एकूण ऑर्डर: " + data.length;

    if (!Array.isArray(data) || data.length === 0) {
      $("orders").textContent =
        "अजून कोणतीही ऑर्डर नाही.";
      return;
    }

    data.forEach(order => {
      $("orders").append(createOrderCard(order));
    });

  } catch (error) {
    $("adminMsg").textContent =
      "सर्व्हरशी संपर्क होऊ शकला नाही.";
  } finally {
    $("load").disabled = false;
  }
}
