import React, { useState } from "react";

export default function AddPerson({
  onAdd,
  placeholder,
}: {
  onAdd: (a: string) => any;
  placeholder: string;
}) {
  const [value, setValue] = useState<string>("");

  return (
    <form
      id="person-form"
      onSubmit={(e) => {
        e.preventDefault();

        if (value) {
          onAdd(value);
          setValue("");
        }
      }}
    >
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
      ></input>
    </form>
  );
}
