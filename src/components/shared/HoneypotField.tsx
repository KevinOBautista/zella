/**
 * Invisible to real visitors, commonly auto-filled by simple form bots.
 * Positioned off-screen rather than `display:none` — some bots skip
 * hidden inputs but not off-screen ones, so this catches more of them.
 * Controlled (not ref-based) so reading its value never touches a ref
 * from inside a submit handler closure during render.
 */
export function HoneypotField({
  value,
  onChange,
  name = "hp_field",
}: {
  value: string;
  onChange: (value: string) => void;
  name?: string;
}) {
  return (
    <div aria-hidden="true" style={{ position: "absolute", left: "-9999px", top: "-9999px" }}>
      <label htmlFor={name}>Leave this field empty</label>
      <input
        id={name}
        name={name}
        type="text"
        tabIndex={-1}
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
