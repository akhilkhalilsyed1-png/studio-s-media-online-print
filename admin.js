
const $ = id => document.getElementById(id);

const API_URL =
  "https://studio-s-media-api.akhilkhalilsyed1.workers.dev";

let token = "";

$("load").onclick = loadOrders;

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

async function loadOrders() {
  token = $("password").value.trim();

  if (!token) {
    $("adminMsg").textContent = "कृपया Admin Password टाका.";
    return;
  }

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

    if (data.length === 0) {
      $("orders").textContent = "अजून कोणतीही ऑर्डर नाही.";
      return;
    }

    data.forEach(o => {
      const card = document.createElement("article");
      card.className = "panel";
      card.style.marginTop = "16px";

      const title = document.createElement("h3");
      title.textContent =
        `${o.orderNumber} — ${o.name} (${o.phone})`;
      card.append(title);

      const info = document.createElement("p");
      info.textContent =
        `दिनांक: ${o.createdAt || "-"} | ` +
        `प्रिंट: ${o.printType} | ` +
        `प्रती: ${o.copies} | ` +
        `पेमेंट: ${o.payment || "-"} | ` +
        `स्थिती: ${statusLabels[o.status] || o.status}`;

      card.append(info);

      const address = document.createElement("p");
      address.textContent =
        "पत्ता: " + (o.address || "-");
      card.append(address);

      if (o.notes) {
        const notes = document.createElement("p");
        notes.textContent = "विशेष सूचना: " + o.notes;
        card.append(notes);
      }

      const fileHeading = document.createElement("h4");
      fileHeading.textContent = "अपलोड केलेल्या फाइल्स:";
      card.append(fileHeading);

      const files = document.createElement("ul");

      (o.files || []).forEach(f => {
        const li = document.createElement("li");
        const btn = document.createElement("button");

        btn.textContent = "डाउनलोड: " + f.original_name;

        btn.onclick = async () => {
          btn.disabled = true;
          btn.textContent = "डाउनलोड होत आहे...";

          try {
            const fileResponse = await api(
              `/api/admin/file/${encodeURIComponent(o.orderNumber)}/${encodeURIComponent(f.stored_name)}`
            );

            if (!fileResponse.ok) {
              const errorData = await fileResponse.json();
              throw new Error(
                errorData.error || "डाउनलोड अयशस्वी."
              );
            }

            const blob = await fileResponse.blob();
            const objectURL = URL.createObjectURL(blob);

            const link = document.createElement("a");
            link.href = objectURL;
            link.download = f.original_name;
            document.body.appendChild(link);
            link.click();
            link.remove();

            setTimeout(() => {
              URL.revokeObjectURL(objectURL);
            }, 1000);

            btn.textContent = "डाउनलोड पूर्ण";
          } catch (error) {
            alert(error.message);
            btn.textContent = "पुन्हा डाउनलोड करा";
          } finally {
            btn.disabled = false;
          }
        };

        li.append(btn);
        files.append(li);
      });

      card.append(files);

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
        "New", "Approved", "Printed", "Cancelled"
      ].includes(o.status) ? o.status : "New";

      card.append(select);

      const saveButton = document.createElement("button");
      saveButton.textContent = "स्थिती जतन करा";

      saveButton.onclick = async () => {
        saveButton.disabled = true;
        saveButton.textContent = "जतन होत आहे...";

        try {
          const result = await api(
            `/api/admin/orders/${o.id}`,
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

          const resultData = await result.json();

          if (!result.ok) {
            throw new Error(
              resultData.error || "स्थिती जतन झाली नाही."
            );
          }

          $("adminMsg").textContent =
            "ऑर्डरची स्थिती यशस्वीपणे जतन झाली.";

          await loadOrders();

        } catch (error) {
          $("adminMsg").textContent = error.message;
        } finally {
          saveButton.disabled = false;
          saveButton.textContent = "स्थिती जतन करा";
        }
      };

      card.append(saveButton);
      $("orders").append(card);
    });

  } catch (error) {
    $("adminMsg").textContent =
      "सर्व्हरशी संपर्क होऊ शकला नाही.";
  }
}
