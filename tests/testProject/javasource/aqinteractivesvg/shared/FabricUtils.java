package aqinteractivesvg.shared;

import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;

import org.apache.batik.anim.dom.SAXSVGDocumentFactory;
import org.apache.batik.bridge.BridgeContext;
import org.apache.batik.bridge.DocumentLoader;
import org.apache.batik.bridge.GVTBuilder;
import org.apache.batik.bridge.UserAgent;
import org.apache.batik.bridge.UserAgentAdapter;
import org.apache.batik.util.XMLResourceDescriptor;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;

import com.mendix.core.Core;
import com.mendix.logging.ILogNode;
import com.mendix.systemwideinterfaces.core.IContext;
import com.mendix.systemwideinterfaces.core.IMendixObject;
import com.mendix.systemwideinterfaces.core.meta.IMetaObject;

import aqinteractivesvg.proxies.ENUM_ElementType;
import aqinteractivesvg.proxies.ENUM_ValueType;
import aqinteractivesvg.proxies.FabricContainer;
import aqinteractivesvg.proxies.FabricElement;
import aqinteractivesvg.proxies.FabricGroup;
import aqinteractivesvg.proxies.FabricProperty;
import aqinteractivesvg.proxies.GroupPropertyMapping;

public class FabricUtils {
	public static Document parseDocument(IContext context, IMendixObject svgFile) throws IOException {
		String parser = XMLResourceDescriptor.getXMLParserClassName();
		SAXSVGDocumentFactory factory = new SAXSVGDocumentFactory(parser);

		Document doc;
		try (InputStream is = Core.getFileDocumentContent(context, svgFile)) {
			doc = factory.createDocument("https://www.auraq.com/svg", is);
		}

		UserAgent userAgent = new UserAgentAdapter();
		DocumentLoader loader = new DocumentLoader(userAgent);
		BridgeContext bridgeContext = new BridgeContext(userAgent, loader);
		bridgeContext.setDynamicState(BridgeContext.DYNAMIC);
		// Enable CSS- and SVG-specific enhancements.
		(new GVTBuilder()).build(bridgeContext, doc);

		return doc;
	}

	public static List<IMendixObject> processElements(IContext context,
			Element rootElement,
			String groupEntityName,
			List<GroupPropertyMapping> propertyMappings,
			Boolean isSelectable,
			FabricContainer container,
			Boolean collapseGroups) {
		List<IMendixObject> groupList = new ArrayList<IMendixObject>();
		List<IMendixObject> groupElementList = new ArrayList<IMendixObject>();

		IMendixObject mxGroup = createGroup(
				context,
				rootElement,
				groupEntityName,
				propertyMappings,
				isSelectable,
				container);
		groupList.add(mxGroup);
		processElement(
				context,
				groupList,
				groupElementList,
				rootElement,
				groupEntityName,
				propertyMappings,
				isSelectable,
				container,
				collapseGroups,
				mxGroup,
				true);

		Core.commit(context, groupElementList);
		Core.commit(context, groupList);

		return groupList;
	}

	public static void validateGroupEntity(String groupEntityName) throws Exception {
		if (!groupEntityName.equals(FabricGroup.getType())
				&& !ObjectIsSpecialisationOf(groupEntityName, FabricGroup.getType())) {
			throw new Exception(String.format("Entity '%s' is not a specialisation of type '%s'", FabricGroup.getType(),
					groupEntityName));
		}
	}

	private static void processElement(
			IContext context,
			List<IMendixObject> groupList,
			List<IMendixObject> groupElementList,
			Element rootElement,
			String groupEntityName,
			List<GroupPropertyMapping> propertyMappings,
			Boolean isSelectable,
			FabricContainer container,
			Boolean collapseGroups,
			IMendixObject mxGroup,
			Boolean firstRun) {
		NodeList children = rootElement.getChildNodes();
		if (children == null) {
			return;
		}

		int childrenLength = children.getLength();
		for (int i = 0; i < childrenLength; i++) {
			if (children.item(i).getNodeType() == Node.ELEMENT_NODE) {
				Element childElement = (Element) children.item(i);
				String id = childElement.getAttribute("id");

				
				IMendixObject mxElement = Core.instantiate(context, FabricElement.entityName);
				mxElement.setValue(context, FabricElement.MemberNames._ID.toString(), id);
				mxElement.setValue(context, FabricElement.MemberNames.FabricElement_FabricGroup.toString(),
				mxGroup.getId());
				mxElement.setValue(context, FabricElement.MemberNames.Order.toString(), i + 1);
				
				if (childElement.hasAttribute("fill")) {
					String fill = childElement.getAttribute("fill");
					fill = fill.equals("none") ? "transparent" : fill;
					addElementProperty(context, ENUM_ValueType.String, "fill", fill, mxElement);
				}

				if (childElement.hasAttribute("stroke")) {
					String stroke = childElement.getAttribute("stroke");
					addElementProperty(context, ENUM_ValueType.String, "stroke", stroke, mxElement);
				}

				if (childElement.hasAttribute("stroke-width")) {
					String strokeWidth = childElement.getAttribute("stroke-width");
					addElementProperty(context, ENUM_ValueType.Decimal, "strokeWidth", strokeWidth, mxElement);
				}

				switch (childElement.getNodeName()) {
					case "path":
						mxElement.setValue(context, FabricElement.MemberNames.ElementType.toString(),
								ENUM_ElementType.path.name());
						String d = childElement.getAttribute("d");
						addElementProperty(context, ENUM_ValueType.String, "path", d, mxElement);
						groupElementList.add(mxElement);
						break;
					case "rect":
						mxElement.setValue(context, FabricElement.MemberNames.ElementType.toString(),
								ENUM_ElementType.rect.name());
						String x = childElement.getAttribute("x");
						String y = childElement.getAttribute("y");
						String width = childElement.getAttribute("width");
						String height = childElement.getAttribute("height");
						addElementProperty(context, ENUM_ValueType.Decimal, "x", x, mxElement);
						addElementProperty(context, ENUM_ValueType.Decimal, "y", y, mxElement);
						addElementProperty(context, ENUM_ValueType.Decimal, "width", width, mxElement);
						addElementProperty(context, ENUM_ValueType.Decimal, "height", height,
								mxElement);
						groupElementList.add(mxElement);
						break;
					case "line":
						mxElement.setValue(context, FabricElement.MemberNames.ElementType.toString(),
								ENUM_ElementType.line.name());
						String x1 = childElement.getAttribute("x1");
						String y1 = childElement.getAttribute("y1");
						String x2 = childElement.getAttribute("x2");
						String y2 = childElement.getAttribute("y2");
						String coordinates = String.format("[%s,%s,%s,%s]", x1, y1, x2, y2);
						addElementProperty(context, ENUM_ValueType.String, "coords", coordinates,
								mxElement);
						groupElementList.add(mxElement);
						break;
					case "g":
						logger.debug("Nested group with ID: " + id);
						Core.delete(context, mxElement);

						if (collapseGroups) {
							processElement(
									context,
									groupList,
									groupElementList,
									childElement,
									groupEntityName,
									propertyMappings,
									isSelectable,
									container,
									collapseGroups,
									mxGroup,
									false);
						} else {
							var newMxGroup = createGroup(
									context,
									childElement,
									groupEntityName,
									propertyMappings,
									isSelectable,
									container);
							groupList.add(newMxGroup);
							processElement(
									context,
									groupList,
									groupElementList,
									childElement,
									groupEntityName,
									propertyMappings,
									isSelectable,
									container,
									collapseGroups,
									newMxGroup,
									false);
						}
						break;
					default:
						logger.warn("Element ID: " + id + ", unsupported element type: " + childElement.getNodeName());
						break;
				}
			}
		}
	}

	private static IMendixObject createGroup(IContext context,
			Element rootElement,
			String groupEntityName,
			List<GroupPropertyMapping> propertyMappings,
			Boolean isSelectable,
			FabricContainer container) {
		IMendixObject mxGroup = Core.instantiate(context, groupEntityName);
		String groupId = rootElement.getAttribute("id");

		mxGroup.setValue(
				context,
				FabricGroup.MemberNames._ID.toString(),
				groupId);
		mxGroup.setValue(
				context,
				FabricGroup.MemberNames.IsSelectable.toString(),
				isSelectable);
		mxGroup.setValue(
				context,
				FabricGroup.MemberNames.FabricGroup_FabricContainer.toString(),
				container.getMendixObject().getId());

		for (GroupPropertyMapping groupPropertyMapping : propertyMappings) {
			if (rootElement.hasAttribute(groupPropertyMapping.getPropertyName())) {
				mxGroup.setValue(
						context,
						groupPropertyMapping.getMendixAttributeName(),
						rootElement.getAttribute(groupPropertyMapping.getPropertyName()));
			}
		}

		return mxGroup;
	}

	private static IMendixObject addElementProperty(
			IContext context,
			ENUM_ValueType valueType,
			String key,
			Object value,
			IMendixObject mxFabricObject) {
		IMendixObject mxProperty = Core.instantiate(context, FabricProperty.entityName);
		mxProperty.setValue(context, FabricProperty.MemberNames.Key.toString(), key);
		mxProperty.setValue(context, FabricProperty.MemberNames.ValueType.toString(), valueType.name());
		mxProperty.setValue(context, FabricProperty.MemberNames.FabricProperty_FabricObject.toString(),
				mxFabricObject.getId());

		switch (valueType) {
			case Date:
				mxProperty.setValue(context, FabricProperty.MemberNames.DateValue.toString(), value);
				break;
			case Decimal:
				mxProperty.setValue(context, FabricProperty.MemberNames.DecimalValue.toString(), value);
				break;
			case Integer:
				mxProperty.setValue(context, FabricProperty.MemberNames.IntegerValue.toString(), value);
				break;
			case String:
				mxProperty.setValue(context, FabricProperty.MemberNames.StringValue.toString(), value);
				break;
			case _Boolean:
				mxProperty.setValue(context, FabricProperty.MemberNames.BooleanValue.toString(), value);
				break;
			case _Long:
				mxProperty.setValue(context, FabricProperty.MemberNames.LongValue.toString(), value);
				break;
		}

		return mxProperty;
	}

	private static Boolean ObjectIsSpecialisationOf(String ObjectToCheckCompleteName, String SuperObjectCompleteName) {
		IMetaObject meta = Core.getMetaObject(ObjectToCheckCompleteName);

		Boolean matchFound = false;
		IMetaObject superObjects[] = new IMetaObject[meta.getSuperObjects().size()];
		superObjects = meta.getSuperObjects().toArray(superObjects);
		for (IMetaObject superObject : superObjects) {
			String superName = superObject.getName();
			if (SuperObjectCompleteName.equals(superName)) {
				matchFound = true;
				break;
			}
		}

		return matchFound;
	}

	public static ILogNode logger = Core.getLogger("SVG Parser");
}
