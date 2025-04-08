import VeDelegateButtonWrapper from "~/modules/veDelegate/ButtonWrapper";

export default function VeDelegateWrapper() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-16">

      <div>
        <h1><code>Default</code></h1>
        <VeDelegateButtonWrapper appId="0x9bc95bbe51b41d526e45466b32a95c2f170a79e74fe31a5782762f7a545e567a" />
      </div>

      <div>
        <h1><code>mode = light</code></h1>
        <VeDelegateButtonWrapper mode="light" appId="0x9bc95bbe51b41d526e45466b32a95c2f170a79e74fe31a5782762f7a545e567a" />
      </div>

      <div>
        <h1><code>mode = light, primaryColor = #090</code></h1>
        <VeDelegateButtonWrapper mode="light" primaryColor="#090" appId="0x9bc95bbe51b41d526e45466b32a95c2f170a79e74fe31a5782762f7a545e567a" />
      </div>

      <div>
        <h1><code>mode = dark, primaryColor = #f00</code></h1>
        <VeDelegateButtonWrapper mode="dark" primaryColor="#f00" appId="0x9bc95bbe51b41d526e45466b32a95c2f170a79e74fe31a5782762f7a545e567a" />
      </div>
    </div>
  );
}