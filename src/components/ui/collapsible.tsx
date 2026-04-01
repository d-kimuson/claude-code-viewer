import * as CollapsiblePrimitive from "@radix-ui/react-collapsible";

const Collapsible = ({ ...props }: React.ComponentProps<typeof CollapsiblePrimitive.Root>) => {
  return <CollapsiblePrimitive.Root data-slot="collapsible" {...props} />;
};

const CollapsibleTrigger = ({
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.CollapsibleTrigger>) => {
  return <CollapsiblePrimitive.CollapsibleTrigger data-slot="collapsible-trigger" {...props} />;
};

const CollapsibleContent = ({
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.CollapsibleContent>) => {
  return <CollapsiblePrimitive.CollapsibleContent data-slot="collapsible-content" {...props} />;
};

export { Collapsible, CollapsibleContent, CollapsibleTrigger };
