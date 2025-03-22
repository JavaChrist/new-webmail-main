"use client";

import { useState } from "react";
import { Download, Upload } from "lucide-react";
import { Contact } from "./ContactModal";

interface ContactImportExportProps {
  contacts: Contact[];
  onImport: (contacts: Contact[]) => void;
  isDarkMode?: boolean;
}

export default function ContactImportExport({
  contacts,
  onImport,
  isDarkMode = true,
}: ContactImportExportProps) {
  const [importing, setImporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<"json" | "csv">("csv");

  const convertToCSV = (contacts: Contact[]) => {
    const headers = [
      "Prénom",
      "Nom",
      "Email",
      "Téléphone",
      "Entreprise",
      "Adresse",
      "Code Postal",
      "Ville",
      "Notes",
      "Catégorie",
    ];
    const rows = contacts.map((contact) =>
      [
        contact.prenom,
        contact.nom,
        contact.email,
        contact.telephone,
        contact.entreprise || "",
        contact.adresse || "",
        contact.codePostal || "",
        contact.ville || "",
        contact.notes || "",
        contact.categorie,
      ]
        .map((field) => `"${field.replace(/"/g, '""')}"`)
        .join(",")
    );

    return [headers.join(","), ...rows].join("\n");
  };

  const parseCSV = (csv: string): Contact[] => {
    const lines = csv.split("\n").filter((line) => line.trim());
    const headers = lines[0].split(",").map((h) => h.trim());

    return lines.slice(1).map((line) => {
      const values = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
      const cleanValues = values.map((val) =>
        val.replace(/^"|"$/g, "").replace(/""/g, '"')
      );

      return {
        prenom: cleanValues[0] || "",
        nom: cleanValues[1] || "",
        email: cleanValues[2] || "",
        telephone: cleanValues[3] || "",
        entreprise: cleanValues[4] || "",
        adresse: cleanValues[5] || "",
        codePostal: cleanValues[6] || "",
        ville: cleanValues[7] || "",
        notes: cleanValues[8] || "",
        categorie: (cleanValues[9] || "other") as Contact["categorie"],
      };
    });
  };

  const exportContacts = () => {
    let content: string;
    let mimeType: string;
    let extension: string;

    if (exportFormat === "json") {
      const exportData = contacts.map((contact) => ({
        nom: contact.nom,
        prenom: contact.prenom,
        email: contact.email,
        telephone: contact.telephone,
        entreprise: contact.entreprise,
        adresse: contact.adresse,
        codePostal: contact.codePostal,
        ville: contact.ville,
        notes: contact.notes,
        categorie: contact.categorie,
      }));
      content = JSON.stringify(exportData, null, 2);
      mimeType = "application/json";
      extension = "json";
    } else {
      content = convertToCSV(contacts);
      mimeType = "text/csv";
      extension = "csv";
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `contacts_${
      new Date().toISOString().split("T")[0]
    }.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const importContacts = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        let importedContacts: Contact[];

        if (file.name.endsWith(".json")) {
          importedContacts = JSON.parse(content);
        } else if (file.name.endsWith(".csv")) {
          importedContacts = parseCSV(content);
        } else {
          throw new Error("Format de fichier non supporté");
        }

        onImport(importedContacts);
      } catch (error) {
        console.error("Erreur lors de l'import:", error);
        alert("Erreur lors de l'import du fichier");
      } finally {
        setImporting(false);
        event.target.value = "";
      }
    };

    reader.readAsText(file);
  };

  return (
    <div className="flex gap-2 items-center">
      <select
        value={exportFormat}
        onChange={(e) => setExportFormat(e.target.value as "json" | "csv")}
        className={`rounded-md px-2 py-2 ${
          isDarkMode
            ? "bg-gray-700 text-white border-gray-600"
            : "bg-gray-200 text-gray-800 border-gray-300"
        }`}
      >
        <option value="csv">CSV</option>
        <option value="json">JSON</option>
      </select>

      <button
        onClick={exportContacts}
        className={`flex items-center gap-2 px-3 py-2 rounded-md ${
          isDarkMode
            ? "bg-gray-700 hover:bg-gray-600 text-white"
            : "bg-gray-200 hover:bg-gray-300 text-gray-800"
        }`}
        title="Exporter les contacts"
      >
        <Download size={16} />
        <span>Exporter</span>
      </button>

      <label
        className={`flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer ${
          isDarkMode
            ? "bg-gray-700 hover:bg-gray-600 text-white"
            : "bg-gray-200 hover:bg-gray-300 text-gray-800"
        }`}
        title="Importer des contacts"
      >
        <Upload size={16} />
        <span>{importing ? "Importation..." : "Importer"}</span>
        <input
          type="file"
          accept=".json,.csv"
          onChange={importContacts}
          className="hidden"
          disabled={importing}
        />
      </label>
    </div>
  );
}
